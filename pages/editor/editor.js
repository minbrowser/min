/*
// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks
})

window.view = new EditorView(document.querySelector('#editor'), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(mySchema).parse(document.querySelector('#content')),
    plugins: exampleSetup({ schema: mySchema })
  })
})
 */

function initializeEditor () {
  (function (prosemirrorState, prosemirrorView, prosemirrorModel, prosemirrorSchemaBasic, prosemirrorSchemaList, prosemirrorExampleSetup) {
    'use strict'

    // code{

    // Mix the nodes from prosemirror-schema-list into the basic schema to
    // create a schema with list support.
    var mySchema = new prosemirrorModel.Schema({
      nodes: prosemirrorSchemaList.addListNodes(prosemirrorSchemaBasic.schema.spec.nodes, 'paragraph block*', 'block'),
      marks: prosemirrorSchemaBasic.schema.spec.marks
    })

    window.view = new prosemirrorView.EditorView(document.querySelector('#editor'), {
      state: prosemirrorState.EditorState.create({
        doc: prosemirrorModel.DOMParser.fromSchema(mySchema).parse(document.querySelector('#content')),
        plugins: prosemirrorExampleSetup.exampleSetup({ schema: mySchema })
      })
    })
  // }
  }(PM.state, PM.view, PM.model, PM.schema_basic, PM.schema_list, PM.example_setup))

  let oldContent
  setInterval(function () {
    const content = new XMLSerializer().serializeToString(PM.model.DOMSerializer.fromSchema(view.state.schema).serializeFragment(view.state.doc.content))
    if (oldContent !== content) {
      oldContent = content
      window.postMessage({ message: 'editorContentUpdate', content })
    }
  }, 5000)
}

window.addEventListener('message', function (e) {
  if (e.data.message === 'receiveEditorContent') {
    // TODO this is bad, fix it
    document.querySelector('#content').innerHTML = e.data.content || ''
    initializeEditor()
  }
})

window.postMessage({ message: 'editorGetContent' })
