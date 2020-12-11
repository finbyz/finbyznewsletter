from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import parse_addr
from frappe.email.queue import send
from frappe.email.doctype.newsletter.newsletter import Newsletter

@frappe.whitelist()
def import_from(name, doctype):
    doc = frappe.get_doc("Email Group",name)
    """Extract Email Addresses from given doctype and add them to the current list"""
    meta = frappe.get_meta(doctype)
    email_field = [d.fieldname for d in meta.fields
        if d.fieldtype in ("Data", "Small Text", "Text", "Code") and d.options=="Email"][0]
    unsubscribed_field = "unsubscribed" if meta.get_field("unsubscribed") else None
    added = 0

    for user in frappe.db.get_all(doctype, ['name', email_field, unsubscribed_field or "name"]):
        try:
            email = parse_addr(user.get(email_field))[1] if user.get(email_field) else None
            if email:
                frappe.get_doc({
                    "doctype": "Email Group Member",
                    "email_group": doc.name,
                    "email": email,
                    "reference_doctype": doctype,
                    "reference_docname": user.name,
                    "unsubscribed": user.get(unsubscribed_field) if unsubscribed_field else 0
                }).insert(ignore_permissions=True)

                added += 1
        except frappe.UniqueValidationError:
            pass

    frappe.msgprint(_("{0} subscribers added").format(added))

    return update_total_subscribers(doc)

def update_total_subscribers(self):
    self.total_subscribers = self.get_total_subscribers()
    self.db_update()
    return self.total_subscribers

def get_total_subscribers(self):
    return frappe.db.sql("""select count(*) from `tabEmail Group Member`
        where email_group=%s""", self.name)[0][0]


# send mail override in newsletter.py
def queue_all(self):
    Newsletter.validate_send(self)

    sender = self.send_from or frappe.utils.get_formatted_email(self.owner)
    recipients_list = []
    context = {}
    for email_group in get_email_groups(self.name):
        for d in frappe.db.get_all("Email Group Member", ["email","reference_doctype","reference_docname"],
            {"unsubscribed": 0, "email_group": email_group.email_group}):
            recipients_list.append(d.email)
            context = {"doc": frappe.get_doc(d.reference_doctype, d.reference_docname)}
            if not frappe.flags.in_test:
                frappe.db.auto_commit_on_many_writes = True

            attachments = []
            if self.send_attachements:
                files = frappe.get_all("File", fields = ["name"], filters = {"attached_to_doctype": "Newsletter",
                    "attached_to_name":self.name}, order_by="creation desc")

                for file in files:
                    try:
                        # these attachments will be attached on-demand
                        # and won't be stored in the message
                        attachments.append({"fid": file.name})
                    except IOError:
                        frappe.throw(_("Unable to find attachment {0}").format(file.name))
            msg = frappe.render_template(self.message, context)
           
            send(recipients = d.email, sender = sender,
                subject = self.subject, message = msg,
                reference_doctype = d.reference_doctype, reference_name = d.reference_docname,
                add_unsubscribe_link = self.send_unsubscribe_link, attachments=attachments,
                unsubscribe_method = "/unsubscribe",
                unsubscribe_params = {"name": self.name},
                send_priority = 0, queue_separately=True)

    if not frappe.flags.in_test:
        frappe.db.auto_commit_on_many_writes = False

    # if not self.get("recipients"):
    # 	# in case it is called via worker
    # 	self.recipients = recipients_list

    

def get_recipients(self):
    """Get recipients from Email Group"""
    recipients_list = []
    for email_group in get_email_groups(self.name):
        for d in frappe.db.get_all("Email Group Member", ["email","reference_doctype","reference_docname"],
            {"unsubscribed": 0, "email_group": email_group.email_group}):
                recipients_list.append(d.email)
    return list(set(recipients_list))

