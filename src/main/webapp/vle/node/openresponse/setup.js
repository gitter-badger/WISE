var nodeType = 'OpenResponseNode';

var coreScripts = [
	'vle/node/openresponse/OpenResponseNode.js',
	'vle/node/openresponse/NoteNode.js',
	'vle/node/openresponse/openResponseEvents.js',
	/* 
     * the following are needed here for the note nodes that now load
     * in a div of the main page of the vle, not in its own frame 
     */
	'vle/node/openresponse/openresponsestate.js',
    'vle/node/openresponse/openresponse.js'
];

var studentVLEScripts = [
	scriptloader.jquerySrc,
	scriptloader.jqueryUISrc,
	'vle/node/common/nodehelpers.js',
	'vle/util/helperfunctions.js',
	'vle/lib/jquery/js/jsonplugin.js',
	'vle/node/openresponse/openresponsestate.js',
	'vle/node/openresponse/openresponse.js',
	'vle/model/Annotation.js',
	'vle/model/nodevisit.js',
	'vle/lib/tinymce4/js/tinymce/tinymce.min.js'
];

var authorScripts = [
	'vle/node/openresponse/authorview_openresponse.js'
];

var gradingScripts = [
	'vle/node/openresponse/openresponsestate.js'
];

var dependencies = [
	{child:"vle/node/openresponse/OpenResponseNode.js", parent:["vle/node/Node.js"]},
	{child:"vle/node/openresponse/NoteNode.js", parent:["vle/node/Node.js", "vle/node/openresponse/OpenResponseNode.js"]}
];

var css = [
	scriptloader.jqueryUICss,
	"vle/node/common/css/htmlAssessment.css",
	"vle/node/openresponse/openresponse.css"
];

var openResponseNodeClasses = [
	{nodeClass:'openresponse', nodeClassText:'Open Response', icon:'node/openresponse/icons/openresponse28.png'}
];

var noteNodeClasses = [
	{nodeClass:'note', nodeClassText:'Reflection Note (popup)', icon:'node/openresponse/icons/note28.png'}
];

var nodeIconPath = 'node/openresponse/icons/';
componentloader.addNodeIconPath('NoteNode', nodeIconPath);
componentloader.addNodeIconPath('OpenResponseNode', nodeIconPath);

scriptloader.addScriptToComponent('core', coreScripts);
scriptloader.addScriptToComponent('openresponse', studentVLEScripts);
scriptloader.addScriptToComponent('author', authorScripts);
scriptloader.addScriptToComponent('studentwork', gradingScripts);
scriptloader.addDependencies(dependencies);
scriptloader.addCssToComponent('openresponse', css);

scriptloader.addScriptToComponent('peerreviewhelper', 'vle/node/openresponse/openresponse.js');
scriptloader.addCssToComponent('core', 'vle/node/openresponse/openresponse.css');

componentloader.addNodeClasses('OpenResponseNode', openResponseNodeClasses);

var nodeTemplateParams = [
	{
		nodeTemplateFilePath:'node/openresponse/openResponseTemplate.or',
		nodeExtension:'or'
	}
];

componentloader.addNodeTemplateParams('OpenResponseNode', nodeTemplateParams);

componentloader.addNodeClasses('NoteNode', noteNodeClasses);

var nodeTemplateParams = [
	{
		nodeTemplateFilePath:'node/openresponse/noteTemplate.or',
		nodeExtension:'or'
	}
];

componentloader.addNodeTemplateParams('NoteNode', nodeTemplateParams);

//used to notify scriptloader that this script has finished loading
if(typeof eventManager != 'undefined'){
	eventManager.fire('scriptLoaded', 'vle/node/openresponse/setup.js');
};