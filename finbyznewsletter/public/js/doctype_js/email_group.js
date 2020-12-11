frappe.ui.form.on('Email Group', {
    refresh: function (frm) {
        frm.remove_custom_button('Import Subscribers', 'Action');
        console.log('call')
        frm.add_custom_button(__("Import Subscriber"), function () {
            frappe.prompt({
                fieldtype: "Select", options: frm.doc.__onload.import_types,
                label: __("Import Email From"), fieldname: "doctype", reqd: 1
            },
                function (data) {
                    frappe.call({
                        method: "finbyznewsletter.api.import_from",
                        args: {
                            "name": frm.doc.name,
                            "doctype": data.doctype
                        },
                        callback: function (r) {
                            frm.set_value("total_subscribers", r.message);
                        }
                    })
                }, __("Import Subscribers"), __("Import"));
        }, __("Action"));
    }
})