HtmlNode.prototype=new Node;HtmlNode.prototype.constructor=HtmlNode;HtmlNode.prototype.parent=Node.prototype;HtmlNode.authoringToolName="Text/HTML Page";HtmlNode.authoringToolDescription="Students read information from an HTML page";function HtmlNode(a,b){this.view=b;this.type=a;this.audios=[];this.selfRendering=this.audioSupported=!0}HtmlNode.prototype.setHtmlContent=function(a){this.content.setContent(a)};HtmlNode.prototype.parseDataJSONObj=function(a){return HTMLSTATE.prototype.parseDataJSONObj(a)};
HtmlNode.prototype.exportNode=function(){var a="";a+=this.exportNodeHeader();a+="<content><![CDATA[";a+=this.element.getElementsByTagName("content")[0].firstChild.nodeValue;a+="]]\></content>";a+=this.exportNodeFooter();return a};HtmlNode.prototype.doNothing=function(){window.frames.ifrm.document.open();window.frames.ifrm.document.write(this.injectBaseRef(this.elementText));window.frames.ifrm.document.close()};HtmlNode.prototype.getHTMLContentTemplate=function(){return createContent("")};
NodeFactory.addNode("HtmlNode",HtmlNode);typeof eventManager!="undefined"&&eventManager.fire("scriptLoaded","vle/node/html/HtmlNode.js");View.prototype.htmlDispatcher=function(){};for(var events=[],x=0;x<events.length;x++)componentloader.addEvent(events[x],"htmlDispatcher");typeof eventManager!="undefined"&&eventManager.fire("scriptLoaded","vle/node/html/htmlEvents.js");
if(typeof eventManager != 'undefined'){eventManager.fire('scriptLoaded', 'vle/node/html/html_core_min.js');}
