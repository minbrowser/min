//displayes files like markdown, json, etc in a nice way

function showSourceFile(lang) {

	if (document.body.childNodes.length != 1) {
		return;
	}

	var beautify = require("js-beautify");

	if (lang == "css") {
		beautify = beautify.css;
	}

	var text = document.body.textContent;
	window.highlighter = require("highlight.js");

	var formattedText = beautify(text, {
		indent_size: 4
	});

	//TODO figure out a way to include external files here
	//includes "androidstudio" theme - from highlight.js

	document.body.innerHTML = '<style>html,body{margin:0;padding:0;font-size:18px;box-sizing:border-box;font-family:"Courier", monospace}pre{margin:0}.hljs{color:#a9b7c6;background:#282b2e;display:block;overflow-x:auto;padding:.5em;-webkit-text-size-adjust:none;min-height:100vh}.hljs-number{color:#6897BB}.hljs-deletion,.hljs-keyword{color:#cc7832}.hljs-comment{color:grey}.hljs-annotation{color:#bbb529}.hljs-addition,.hljs-string{color:#6A8759}.hljs-change,.hljs-function .hljs-title{color:#ffc66d}.hljs-doctype,.hljs-tag .hljs-title{color:#e8bf6a}.hljs-tag .hljs-attribute{color:#bababa}.hljs-tag .hljs-value{color:#a5c261}</style>'
	document.body.innerHTML += "<pre><code></code></pre>";

	document.querySelector("pre > code").textContent = formattedText;
	highlighter.initHighlighting();

	document.head.innerHTML = "<link rel='icon' href='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42gEFAPr/ACgrLv8CgQGB0u9ZtgAAAABJRU5ErkJggg=='/>"; //favicon to change navbar color

	document.title = window.location;
}

function showMarkdownFile() {

	if (document.body.childNodes.length != 1) {
		return;
	}

	var marked = require("marked");
	var highlighter = require("highlight.js");

	var text = document.body.textContent;
	var fmt = marked(text);

	document.head.innerHTML = "<style>body,html{padding:0;margin:0;display:flex;width:100vw;font-family:Helvetica,'.SFNSText-Regular'}.pane{flex:1;overflow:auto;padding:1em}#textPane{margin:0;font-size:15.5px;font-weight:500;border-right:1px #e5e5e5 solid;white-space:pre-wrap;flex:0.8;padding:1.25em;font-family:'Courier', monospace}#previewPane pre{font-size:18px}</style>";

	//this is copied from reader/readerView.css
	document.querySelector("style").innerHTML += "img,pre{display:block}blockquote,p{line-height:1.5em}h1,h2{font-weight:inherit}h3,h4{padding:.5em 0;margin:0;font-size:1.4em;font-weight:500}h4{font-size:1.25em;font-weight:600}.page{padding:2.25rem}img{max-width:100%;height:auto;margin:auto}ol li,ul li{padding:.25rem 0}a{text-decoration:none;color:inherit;font-size:1em;pointer-events:none}figure{max-width:50%;float:right}@media all and (max-width:600px){figure{max-width:100%;float:initial;margin:0}}figure figcaption{padding-top:1em}code,code *,pre,pre *{font-family:monospace}pre{overflow:auto}blockquote{border-left:1px currentColor solid;padding-left:.5em;font-size:1.2em;margin:1.5em 0}";


	//github-gist style from highlight.js
	document.querySelector("style").innerHTML += ".hljs{display:block;background:#fff;padding:.5em;color:#333;overflow-x:auto;-webkit-text-size-adjust:none}.bash .hljs-shebang,.hljs-comment,.java .hljs-javadoc,.javascript .hljs-javadoc,.rust .hljs-preprocessor{color:#969896}.apache .hljs-sqbracket,.c .hljs-preprocessor,.coffeescript .hljs-regexp,.coffeescript .hljs-subst,.cpp .hljs-preprocessor,.hljs-string,.javascript .hljs-regexp,.json .hljs-attribute,.less .hljs-built_in,.makefile .hljs-variable,.markdown .hljs-blockquote,.markdown .hljs-emphasis,.markdown .hljs-link_label,.markdown .hljs-strong,.markdown .hljs-value,.nginx .hljs-number,.nginx .hljs-regexp,.objectivec .hljs-preprocessor .hljs-title,.perl .hljs-regexp,.php .hljs-regexp,.scss .hljs-built_in,.xml .hljs-value{color:#df5000}.css .hljs-at_rule,.css .hljs-important,.go .hljs-typename,.haskell .hljs-type,.hljs-keyword,.http .hljs-request,.ini .hljs-setting,.java .hljs-javadoctag,.javascript .hljs-javadoctag,.javascript .hljs-tag,.less .hljs-at_rule,.less .hljs-tag,.nginx .hljs-title,.objectivec .hljs-preprocessor,.php .hljs-phpdoc,.scss .hljs-at_rule,.scss .hljs-important,.scss .hljs-tag,.sql .hljs-built_in,.stylus .hljs-at_rule,.swift .hljs-preprocessor{color:#a71d5d}.apache .hljs-cbracket,.apache .hljs-common,.apache .hljs-keyword,.bash .hljs-built_in,.bash .hljs-literal,.c .hljs-built_in,.c .hljs-number,.coffeescript .hljs-built_in,.coffeescript .hljs-literal,.coffeescript .hljs-number,.cpp .hljs-built_in,.cpp .hljs-number,.cs .hljs-built_in,.cs .hljs-number,.css .hljs-attribute,.css .hljs-function,.css .hljs-hexcolor,.css .hljs-number,.go .hljs-built_in,.go .hljs-constant,.haskell .hljs-number,.http .hljs-attribute,.http .hljs-literal,.java .hljs-number,.javascript .hljs-built_in,.javascript .hljs-literal,.javascript .hljs-number,.json .hljs-number,.less .hljs-attribute,.less .hljs-function,.less .hljs-hexcolor,.less .hljs-number,.makefile .hljs-keyword,.markdown .hljs-link_reference,.nginx .hljs-built_in,.objectivec .hljs-built_in,.objectivec .hljs-literal,.objectivec .hljs-number,.php .hljs-literal,.php .hljs-number,.puppet .hljs-function,.python .hljs-number,.ruby .hljs-constant,.ruby .hljs-number,.ruby .hljs-prompt,.ruby .hljs-subst .hljs-keyword,.ruby .hljs-symbol,.rust .hljs-number,.scss .hljs-attribute,.scss .hljs-function,.scss .hljs-hexcolor,.scss .hljs-number,.scss .hljs-preprocessor,.sql .hljs-number,.stylus .hljs-attribute,.stylus .hljs-hexcolor,.stylus .hljs-number,.stylus .hljs-params,.swift .hljs-built_in,.swift .hljs-number{color:#0086b3}.apache .hljs-tag,.cs .hljs-xmlDocTag,.css .hljs-tag,.stylus .hljs-tag,.xml .hljs-title{color:#63a35c}.bash .hljs-variable,.cs .hljs-preprocessor,.cs .hljs-preprocessor .hljs-keyword,.css .hljs-attr_selector,.css .hljs-value,.ini .hljs-keyword,.ini .hljs-value,.javascript .hljs-tag .hljs-title,.makefile .hljs-constant,.nginx .hljs-variable,.scss .hljs-variable,.xml .hljs-tag{color:#333}.bash .hljs-title,.c .hljs-title,.coffeescript .hljs-title,.cpp .hljs-title,.cs .hljs-title,.css .hljs-class,.css .hljs-id,.css .hljs-pseudo,.diff .hljs-chunk,.haskell .hljs-pragma,.haskell .hljs-title,.ini .hljs-title,.java .hljs-title,.javascript .hljs-title,.less .hljs-class,.less .hljs-id,.less .hljs-pseudo,.makefile .hljs-title,.objectivec .hljs-title,.perl .hljs-sub,.php .hljs-title,.puppet .hljs-title,.python .hljs-decorator,.python .hljs-title,.ruby .hljs-parent,.ruby .hljs-title,.rust .hljs-title,.scss .hljs-class,.scss .hljs-id,.scss .hljs-pseudo,.stylus .hljs-class,.stylus .hljs-id,.stylus .hljs-pseudo,.stylus .hljs-title,.swift .hljs-title,.xml .hljs-attribute{color:#795da3}.coffeescript .hljs-attribute,.coffeescript .hljs-reserved{color:#1d3e81}.diff .hljs-chunk{font-weight:700}.diff .hljs-addition{color:#55a532;background-color:#eaffea}.diff .hljs-deletion{color:#bd2c00;background-color:#ffecec}.markdown .hljs-link_url{text-decoration:underline}";

	document.body.innerHTML = "<pre class='pane' id='textPane'></pre><div class='pane' id='previewPane'></div>";

	var panes = {
		text: document.getElementById("textPane"),
		preview: document.getElementById("previewPane"),
	}

	panes.text.textContent = text;
	panes.preview.innerHTML = fmt;

	//enable highlighting of code blocks

	highlighter.initHighlighting();
}


var filename = window.location.pathname;

var supportedFileExtensions = ["json", "js", "css"];

for (var i = 0; i < supportedFileExtensions.length; i++) {
	var index = filename.indexOf("." + supportedFileExtensions[i]);
	if (index != -1 && index == filename.length - (supportedFileExtensions[i].length + 1)) {
		showSourceFile(supportedFileExtensions[i]);
	}
}


var markdownFiles = ["md", "mdown", "markdown", "markdn", "mtext", "mdtext", "mdwn", "mkd", "mkdn", "text"];


for (var i = 0; i < markdownFiles.length; i++) {
	var index = filename.indexOf("." + markdownFiles[i]);
	if (index != -1 && index == filename.length - (markdownFiles[i].length + 1)) {
		showMarkdownFile(markdownFiles[i]);
	}
}
