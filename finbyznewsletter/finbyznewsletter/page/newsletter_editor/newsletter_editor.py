import frappe

@frappe.whitelist()
def get_email_detail(email_template):
    doc = frappe.get_doc("Email Template",email_template)
    return doc

@frappe.whitelist()
def get_doctype(doctype):
    doc = frappe.get_doc("DocType",doctype)
    return doc



@frappe.whitelist()
def get_doc_field_list(doc_type):
    filed_list = []
    fields = frappe.get_meta(doc_type).fields
    exclude_fields = ['naming_series']
    for d in fields:
        if d.fieldname not in exclude_fields and \
			d.fieldtype not in ['HTML', 'Section Break', 'Column Break', 'Button', 'Read Only','Table']:
            filed_list.append(d.fieldname)
    return filed_list


@frappe.whitelist()
def save_template(template,html,mjml,components,style):
    newsletter_list = frappe.get_all("Newsletter",fields=["name"],filters={"email_template": template})
    for newsletter in newsletter_list:
        frappe.db.set_value("Newsletter",newsletter.name,"message",html)
    frappe.db.set_value("Email Template",template,"response",html)
    frappe.db.set_value("Email Template",template,"html",html)
    frappe.db.set_value("Email Template",template,"mjml",mjml)
    frappe.db.set_value("Email Template",template,"style",style)
    frappe.db.set_value("Email Template",template,"components",components) 


    frappe.db.commit()