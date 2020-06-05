const template = {
	html: "",
	css: null,
	style: null,
	components: null,
	fields: [],
	docname: null,
	mjml: '<mjml><mj-body></mj-body></mjml>',
	fullScreen: 0,
	response: null

}


frappe.pages['newsletter-editor'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Newsletter Editor',
		single_column: true
	});

	page.email_template_field = page.add_field({
		fieldname: 'email_template',
		label: __('Email Template'),
		fieldtype: 'Link',
		options: 'Email Template',
		filters: {
			'mj_template': 1
		},
		change: function () {
			frappe.call({
				method: "finbyznewsletter.finbyznewsletter.page.newsletter_editor.newsletter_editor.get_email_detail",
				args: {
					'email_template': page.email_template_field.value
				},
				callback: function (r) {
					console.log(r.message)
					template.docname = page.email_template_field.value
					template.mjml = r.message.mjml
					template.components = r.message.components
					template.fields = []
					template.response = r.message.response
					frappe.db.get_value("Email Template", page.email_template_field.value, 'doc_type', function (r) {
						if (r.doc_type) {
							frappe.call({
								method: "finbyznewsletter.finbyznewsletter.page.newsletter_editor.newsletter_editor.get_doc_field_list",
								args: {
									'doc_type': r.doc_type
								},
								callback: function (r) {
									if (r.message) {
										r.message.forEach(element => {
											template.fields.push(element)
										});
									}
									console.log(template.fields)
									createGrape(template)
								}
							})
						} else {
							createGrape(template)
						}
					})
				}
			})
		}
	});
	frappe.grapes_page = new grapesPage(page);
	createGrape(template)
}

function createGrape(template) {
	if (template.mjml == null || template.mjml == "") {
		template.mjml = '<mjml><mj-body><mj-section><mj-column><mj-text>'+ template.response +'</mj-text></mj-column></mj-section></mj-body></mjml>'
		
	}
	var editor = grapesjs.init({
		container: '#gjs',
		plugins: ['grapesjs-mjml'],
		pluginsOpts: {
			'grapesjs-mjml': {
				/* ...options */ },

		},
		components:  template.mjml,
		colorPicker: {
			appendTo: 'parent',
			offset: {
				top: 10,
				left: -166,
			},
		},
		storageManager: {
			type: null
		},
		assetManager: {
			upload: '/files/',
		}
	});
	editor.Panels.getButton('views', 'open-blocks').set('active', true)

	editor.RichTextEditor.remove('custom-vars')

	editor.RichTextEditor.add('custom-vars', {
		icon: `<select class="gjs-field fields" >
			<option style="color: #fff" value="">- Select -</option>			
				</select>`,
		// Bind the 'result' on 'change' listener
		event: 'change',
		result: (rte, action) => rte.insertHTML(action.btn.firstChild.value),
		// Reset the select on change
		update: (rte, action) => {
			action.btn.firstChild.value = "";
		}
	})
	var select = $(".gjs-field.fields");
	template.fields.forEach(element => {
		select.append('<option style="color: #000" value=' + element + '>' + element + '</option>')
	})

	editor.Panels.addButton('options', [{
		id: 'save',
		className: 'fa fa-floppy-o icon-blank',
		command: function (editor1, sender) {
			console.log(editor.getComponents())
			console.log(editor.getStyle())
			console.log(editor.getCss())
			if (editor.getHtml()) {
				frappe.db.set_value('Email Template', template.docname, 'mjml', editor.getHtml())
				frappe.db.set_value('Email Template', template.docname, 'html', editor.runCommand('mjml-get-code').html)
				frappe.db.set_value('Email Template', template.docname, 'response', editor.runCommand('mjml-get-code').html)
			}

			if (editor.getComponents()) {
				frappe.db.set_value('Email Template', template.docname, 'components', JSON.stringify(editor.getComponents()))
			}

			if (editor.getStyle()) {
				frappe.db.set_value('Email Template', template.docname, 'style', JSON.stringify(editor.getStyle()))
			}
		},
		attributes: {
			title: 'Save Template'
		}
	}, ]);
}


class grapesPage {
	constructor(page) {
		this.page = page;
		this.wrapper = $(page.body);
		this.wrapper.append(frappe.render_template('newsletter_editor'));
		frappe.utils.bind_actions_with_object(this.wrapper, this);
	}
}