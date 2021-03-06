/**
 * Given the type and optional arguments, creates a new 
 * state of the type, passing in the arguments.
 */
View.prototype.pushStudentWork = function(nodeId, nodeState) {
	this.model.pushStudentWorkToLatestNodeVisit(nodeId, nodeState);
};

/**
 * Overwrites the node states array in the latest node visit and saves the node visit
 * to the server
 * @param nodeId the node id for the current step
 * @param nodeStates the new node states array that we will use to overwrite the existing node states array
 * @param successCallback the function that is called after the current node visit is successfully
 * saved to the server
 * @param failureCallback the function that is called after the current node visit fails to save
 * to the server 
 * @param callbackData data that is made available to the successCallback function
 */
View.prototype.overwriteNodeStatesInCurrentNodeVisit = function(nodeId, nodeStates, successCallback, failureCallback, callbackData) {
	//overwrite the node states in the current node visit
	this.model.overwriteNodeStatesInCurrentNodeVisit(nodeId, nodeStates);
	
	//save the current node visit to the server
	this.postCurrentNodeVisit(successCallback, failureCallback, callbackData);
};

/**
 * Overwrites the latest node state in the current node visit and saves
 * the node visit to the server
 * @param nodeId the node id for the current step
 * @param nodeState the new node state
 * @param successCallback the function that is called after the current node visit is successfully
 * saved to the server
 * @param failureCallback the function that is called after the current node visit fails to save
 * to the server 
 * @param callbackData data that is made available to the successCallback function
 */
View.prototype.overwriteLatestNodeStateInCurrentNodeVisit = function(nodeId, nodeState, successCallback, failureCallback, callbackData) {
	//overwrite the latest node state in the current node visit
	this.model.overwriteLatestNodeStateInCurrentNodeVisit(nodeId, nodeState);
	
	//save the current node visit to the server
	this.postCurrentNodeVisit(successCallback, failureCallback, callbackData);
};

/**
 * Given the type and optional arguments, creates a new 
 * state of the type, passing in the arguments.
 */
View.prototype.pushHintState = function(hintState){
	this.getState().getCurrentNodeVisit().hintStates.push(hintState);
};

/**
 * Posts the data for the current node that the user is on back to the
 * server.
 * Does not send the actual data for the step.
 * @param currentNode the current node that the student is on
 */
View.prototype.postCurrentStep = function(currentNode) {
	//check if there is a postCurrentStepUrl
	if(this.getConfig().getConfigParam('postCurrentStepUrl')) {
		//post the data back to the server
		this.connectionManager.request('POST', 3, this.getConfig().getConfigParam('postCurrentStepUrl'), {nodeId: currentNode.id, nodeType: currentNode.type, extraData: currentNode.extraData}, null, this);		
	}
};

/**
 * Posts the current node visit. This is usually used when we need to post
 * intermediate step data before the user has exited the step. An example
 * of this would be brainstorm in which we post the response immediately
 * after the student clicks save and we don't wait until they exit the step.
 * @param callback function to invoke when response is received from the POST. This will be called after 
 * the default callback is invoked.
 * @return
 */
View.prototype.postCurrentNodeVisit = function(successCallback, failureCallback, additionalData) {
	if (this.getConfig().getConfigParam('mode') === "preview" ||
			this.getConfig().getConfigParam('isRunActive') === false) {
		// no need to post data if we're in preview mode or the run is not active and the user is reviewing the run
		return;
	}

	//obtain the current node visit
	var currentNodeVisit = this.getState().getCurrentNodeVisit();

	//obtain the step work id for the visit
	var stepWorkId = currentNodeVisit.id;

	var url;
	if(this.getConfig().getConfigParam('studentDataURL')){
		url = this.getConfig().getConfigParam('studentDataURL');
	} else {
		url = "postdata.html";
	};
	
    var annotationsString = null;
    
    /*
     * get the annotations for the current node visit that need to be saved to 
     * the server
     */
    var annotations = this.getAnnotationsToPost(currentNodeVisit);
    
    if (annotations != null && annotations.length > 0) {
        // get the stringified value of the annotations
        annotationsString = encodeURIComponent($.stringify(annotations));
    }

	//obtain the json string representation of the node visit
	var nodeVisitData = encodeURIComponent($.stringify(currentNodeVisit));

	// Only POST this nodevisit if this nodevisit is not currently being POSTed to the server.
	if (this.isInPOSTInProgressArray(currentNodeVisit)) {
		return;
	} else {
		// add  this nodevisit to postInProgress array
		this.addToPOSTInProgressArray(currentNodeVisit);

		if(this.getUserAndClassInfo() != null) {
			var postParams = {
				id: stepWorkId, 
				runId: this.getConfig().getConfigParam('runId'), 
				periodId: this.getUserAndClassInfo().getPeriodId(),
				userId: this.getUserAndClassInfo().getWorkgroupId(), 
				data: nodeVisitData
			};
			
			if(annotationsString != null) {
				//add the annotation to the params so it will be saved to the server
				postParams.annotations = annotationsString;
			}
			
			this.connectionManager.request('POST', 3, url, 
					postParams, 
					this.processPostResponse, 
					{vle: this, 
					 nodeVisit:currentNodeVisit, 
					 annotations:annotations,
					 successCallback:successCallback,
					 failureCallback:failureCallback,
					 additionalData:additionalData},
					this.processPostFailResponse);
		} else {
			var postParams = {
				id: stepWorkId, 
				runId: this.getConfig().getConfigParam('runId'), 
				periodId: this.getUserAndClassInfo().getPeriodId(),
				userId: '-2',
				data: prepareDataForPost(diff)
			};
			
			if(autoGradedAnnotation != null) {
				//add the annotation to the params so it will be saved to the server
				postParams.annotation = autoGradedAnnotation;
			}
			
			this.connectionManager.request('POST', 3, url, 
					postParams, 
					this.processPostResponse,
					null,
					this.processPostFailResponse);
		};
	}
};

/**
 * Posts an unposted nodeVisit to the server, then sets
 * its visitPostTime upon receiving it in the response
 * from the server.
 * @param nodeVisit its visitPostTime must be null.
 * @param boolean - sync - true if the request should by synchronous
 * @param successCallback callback func when posting was successful. optional.
 * @param failureCallback callback func when posting was unsuccessful. optional.
 * @param additionalData data to be passed into success/failure callback functions. optional.
 * @return
 */
View.prototype.postUnsavedNodeVisit = function(nodeVisit, sync, successCallback, failureCallback, additionalData) {
	if (!this.getConfig() 
			|| !this.getConfig().getConfigParam('mode') 
			|| this.getConfig().getConfigParam('mode') === "preview"
						|| this.getConfig().getConfigParam('isRunActive') === false) {
		// no need to post data if we're in preview mode

		/*
		 * in preview mode we need to give node visits fake step work ids
		 * so that show all work can function properly
		 */
		
		//initialize the fake step work id counter if necessary
		if(this.fakeStepWorkIdCounter == null) {
			this.fakeStepWorkIdCounter = 1;
		}
		
		//get the fake step work id to give the node visit
		var fakeStepWorkId = this.fakeStepWorkIdCounter;
		
		//set the step work id
		nodeVisit.id = fakeStepWorkId;
		nodeVisit.stepWorkId = fakeStepWorkId;
		
		//set the post time
		nodeVisit.visitPostTime = (new Date()).getTime();
		
		//increment the counter
		this.fakeStepWorkIdCounter++;
		
		return;
	}

	var url = this.getConfig().getConfigParam('studentDataURL');

	/* check the post level to determine, what if anything needs to be posted */
	if(this.getProject().getPostLevel()==1){
		/* if postLevel == 1, we are only interested in steps with student work */
		if(nodeVisit.nodeStates && nodeVisit.nodeStates.length>0){
			var postData = encodeURIComponent($.stringify(nodeVisit));
		} else {
			/* return - nothing to do for this post level if there is no student data */
			return;
		};
	} else {
		/* assuming that if logging level is not 1 then it is 5 (which is everything) */
		var postData = encodeURIComponent($.stringify(nodeVisit));
	};

	var studentDataURLParams = {id: nodeVisit.id,
			runId: this.getConfig().getConfigParam('runId'),
			periodId: this.getUserAndClassInfo().getPeriodId(),
			userId: this.getUserAndClassInfo().getWorkgroupId(),
			data: postData};

	if (!successCallback) {
		successCallback = this.processPostResponse;
	}
	if (!failureCallback) {
		failureCallback = this.processPostFailResponse;
	}
	if (!additionalData) {
		additionalData = {vle: this, nodeVisit:nodeVisit};
	}
	
    /*
     * get the annotations for the current node visit that need to be saved to 
     * the server
     */
    var annotations = this.getAnnotationsToPost(nodeVisit);
    
    if (annotations != null && annotations.length > 0) {
        // get the stringified value of the annotations
        var annotationsString = encodeURIComponent($.stringify(annotations));
        
        // set the annotations string into the post params
        studentDataURLParams.annotations = annotationsString;
    }
	
	// Only POST this nodevisit if this nodevisit is not currently being POSTed to the server.
	if (this.isInPOSTInProgressArray(nodeVisit)) {
		return;
	} else {
		//var timeout = 3*1000; // timeout is 3 seconds
		var timeout = null;
		// add  this nodevisit to postInProgress array
		this.addToPOSTInProgressArray(nodeVisit);
		this.connectionManager.request('POST', 3, url, studentDataURLParams, successCallback, additionalData, failureCallback, sync, null);
	}
};

/**
 * Get the annotations for the node visit that need to be saved to the server
 * @param nodeVisit the node visit we want annotations for
 * @returns an array of annotations for the node visit that need to be
 * saved to the server
 */
View.prototype.getAnnotationsToPost = function(nodeVisit) {
    var annotations = [];
    
    //get the auto graded annotation associated with this node visit if it exists
    var autoGradedAnnotation = this.getNodeVisitAutoGradedAnnotation(nodeVisit);
    
    if (autoGradedAnnotation != null) {
        annotations.push(autoGradedAnnotation);
    }
    
    // get the notification annotation associated with this node visit if it exists
    var notificationAnnotation = this.getNodeVisitNotificationAnnotation(nodeVisit);
    
    if (notificationAnnotation != null) {
        annotations.push(notificationAnnotation);
    }
    
    return annotations;
};

/**
 * Posts all non-posted node_visits to the server
 * @param boolean - sync - whether the visits should be posted synchronously
 */
View.prototype.postAllUnsavedNodeVisits = function(sync) {
	
	// get all node_visits that does not have a visitPostTime set.
	// then post them one at a time, and set its visitPostTime based on what the
	// server returns.
	for (var i=0; i<this.getState().visitedNodes.length; i++) {
		var nodeVisit = this.getState().visitedNodes[i];
		if (nodeVisit != null && nodeVisit.visitPostTime == null && nodeVisit.visitEndTime != null) {
			this.postUnsavedNodeVisit(nodeVisit,sync);
		}
	}
};


/**
 * Handles the response from any time we post student data to the server.
 * @param responseText a json string containing the response data
 * @param responseXML
 * @param args any args required by this callback function which
 * 		were passed in when the request was created
 */
View.prototype.processPostResponse = function(responseText, responseXML, args){
	notificationManager.notify("processPostResponse, responseText:" + responseText, 4);
	notificationManager.notify("processPostResponse, nodeVisit: " + args.nodeVisit, 4);

	//obtain the id and post time from the json response
	var responseJSONObj = $.parseJSON(responseText);
	var id = responseJSONObj.id;
	var visitPostTime = responseJSONObj.visitPostTime;
	var annotationPostTime = responseJSONObj.annotationPostTime;
	var annotations = args.annotations;

	/*
	 * set the id for the node visit, this is the same as the id value
	 * for the visit in the stepWork table in the db
	 */
	args.nodeVisit.id = id;
	args.nodeVisit.stepWorkId = id;

	//set the post time
	args.nodeVisit.visitPostTime = visitPostTime;

	// remove nodeVisit from postInProgress array
	args.vle.removeFromPOSTInProgressArray(args.nodeVisit);

	// if successCallback is passed in as callback, delegate the rest of this callback to it and return
	if (args.successCallback != null && typeof args.successCallback == "function") {
		args.successCallback(responseText, responseXML, args);
		
		//fire the event that says we are done processing the post response
		eventManager.fire('processPostResponseComplete');

		return;
	}
	
	/*
	 * Check if the node visit that was just posted was an intermediate post
	 * or a completed node visit. If it was a completed node visit we will
	 * send the student status. If it was an intermediate post, which means
	 * it does not have a visitEndTime, we will not send the student status.
	 */
	if(args.nodeVisit.visitEndTime != null) {
		if(args.vle.isRealTimeEnabled) {
			//we will send the student status to the teacher
			args.vle.sendStudentStatusWebSocketMessage();
		} else {
			//send the student status to the server
			args.vle.sendStudentStatusToServer();
		}		
	}
	
	/*
	 * check if we need to update the annotation post time of the annotations
	 * that were saved to the server along with the node visit
	 */
	if(annotations != null) {
	    
	    // loop through all the annotations and set the post time and step work id
	    for (var a = 0; a < annotations.length; a++) {
	        // get an annotation
	        var annotation = annotations[a];
	        
	        if (id != null) {
	            // set the step work id
	            annotation.stepWorkId = id;
	        }
	        
	        if (annotationPostTime != null) {
	            // set the post time
	            annotation.postTime = annotationPostTime;
	        }
	    }
	}

	//fire the event that says we are done processing the post response
	eventManager.fire('processPostResponseComplete');
};


/**
 * Handles the FAIL response from any time we post student data to the server.
 * @param responseText a json string containing the response data
 * @param responseXML
 * @param args any args required by this callback function which
 * 		were passed in when the request was created
 */
View.prototype.processPostFailResponse = function(responseText, args){
	notificationManager.notify("processPostFailResponse, responseText:" + responseText, 4);
	notificationManager.notify("processPostFailResponse, nodeVisit: " + args.nodeVisit, 4);

	/*
	 * display a message to the student to ask them to refresh 
	 * their browser in case they have lost connection to the
	 * server
	 */
	notificationManager.notify("Warning: Your work from the previous step may not have been saved. Please refresh your browser and make sure it was saved.", 3);

	// remove this nodevisit from postInProgressArray
	args.vle.removeFromPOSTInProgressArray(args.nodeVisit);
	
	// if successCallback is passed in as callback, delegate the rest of this callback to it and return
	if (args.failureCallback != null && typeof args.failureCallback == "function") {
		args.failureCallback(responseText, args);
		
		return;
	}
};



/**
 * Retrieve all the node states for a specific node in an array
 * @param nodeId the node to obtain node states for
 * @return an array of node states
 */
View.prototype.getStudentWorkForNodeId = function(nodeId) {
	/* if this is a duplicate node, we really just want the student work 
	 * for the node it represents, so we'll catch that here */
	var node = this.getProject().getNodeById(nodeId);
	if(node.type=='DuplicateNode'){
		nodeId = node.getNode().id;
	}

	var nodeStates = [];
	for (var i=0; i < this.getState().visitedNodes.length; i++) {
		var nodeVisit = this.getState().visitedNodes[i];
		if (nodeVisit.getNodeId() == nodeId) {
			for (var j=0; j<nodeVisit.nodeStates.length; j++) {
				nodeStates.push(nodeVisit.nodeStates[j]);
			}
		}
	}
	return nodeStates;
};


/**
 * Saves work for the current html step.
 * By Default, the state will be saved for the current-step.
 * if the current step is not an HTML step, do nothing.
 * if node is passed in, save the state for that node
 */
View.prototype.saveState = function(state, node) {
	var currentNode = this.getCurrentNode();
	if (node != null) {
		currentNode = node;
	}
	var newState = null;
	if (currentNode.type == "HtmlNode" || currentNode.type == "DrawNode") {
		newState = new HTMLSTATE(state);
	} else if (currentNode.type == "MySystemNode") {
		newState = new MYSYSTEMSTATE(state);
	} else if (currentNode.type == "SVGDrawNode") {
		newState = new SVGDRAWSTATE(state);
	} else if (currentNode.type == "AnnotatorNode") {
		newState = new ANNOTATORSTATE(state);
	} else if (currentNode.type == "AssessmentListNode") {
		newState = new ASSESSMENTLISTSTATE(state);
	} else if (currentNode.type == "MWNode") {
		newState = new MWSTATE(state);
	} else {
		// we currently do not support this step type
		return;
	}
	// now add the state to the VLE_STATE
	var nodeVisitsForCurrentNode = this.getState().getNodeVisitsByNodeId(currentNode.getNodeId());
	var nodeVisitForCurrentNode = nodeVisitsForCurrentNode[nodeVisitsForCurrentNode.length - 1];
	nodeVisitForCurrentNode.nodeStates.push(newState);
};

/**
 * Handles the saving of any unsaved work when user exits/refreshes/etc
 * @param whether to logout the user
 */
View.prototype.onWindowUnload = function(logout){
	//display splash screen letting user know that saving is occuring 
	$('#onUnloadSaveDiv').dialog('open');

	//set the endVisitTime to the current time for the current state 
	this.getState().endCurrentNodeVisit();
	
	//tell current step to clean up 
	if(this.getCurrentNode()) {
		this.getCurrentNode().onExit();
	}
	
	//synchronously save any unsaved node visits 
	this.postAllUnsavedNodeVisits(true);

	/*
	 * this will save the idea basket if it has changes that have 
	 * not been saved. it will not do anything if the idea basket 
	 * has not changed.
	 */
	this.ideaBasketDivClose();

	//try to blip final message before going
	$('#onUnloadSaveDiv').html('SAVED!!');

	/*
	 * check if we need to log out the user, we need to use the === comparison
	 * because if the user refreshes the screen or navigates to another page
	 * the argument to onWindowUnload will be an event object.
	 */
	if(logout === true) {
		//get the context path e.g. /wise
		var contextPath = this.getConfig().getConfigParam('contextPath');
		
		//logout the user
		this.connectionManager.request('GET',1, contextPath + "/logout", null, function(){},null,null,true);
		window.top.location = contextPath + "/index.html"; // redirect the top level window to the login page
	}

	$('#onUnloadSaveDiv').dialog('close');
};

/**
 * Given assetURL, fetches the student asset via GET request and returns the response to the callback
 * @param assetURL absolute URL to student asset.
 * @param callbackFunc callback upon request completion
 * @param callbackArgs optional arguments to pass into the callback function 
 */
View.prototype.getStudentAsset = function(assetURL, callbackFunc, callbackArgs) {
	$.ajax({
		url:assetURL,
		type:"GET",
		success:function(response) {
			callbackFunc(callbackArgs, response);
		}
	});
};

/**
 * Display student assets
 * @param params Object (optional) specifying asset editor options (type, extensions to show, optional text for new button, callback function)
 */
View.prototype.viewStudentAssets = function(params) {
	if (this.config.getConfigParam("mode") === "preview") {
		alert(this.getI18NString("student_assets_preview_mode"));
		return;
	}
	var view = this;
	if (params){
		view.assetEditorParams = params;
	} else {
		view.assetEditorParams = null;
	}

	//check if the studentAssetsDiv exists
	if($('#studentAssetsDiv').size()==0){
		//get the context path e.g. /wise
		var contextPath = this.getConfig().getConfigParam('contextPath');
		
		//it does not exist so we will create it
		$('#w4_vle').append('<div id="studentAssetsDiv" style="margin-bottom:.3em;"></div>');
		var assetEditorDialogHtml = "<div id='studentAssetEditorDialog' style='display: none; text-align:left;'><div style='margin-bottom:.5em;'>" 
			+ "<div id='assetUploaderBodyDiv'><span style='float:left;'>"+this.getI18NString("student_assets_upload_new_file")+":</span>"
			+ "<input style='margin:0 .5em;' type='file' size='30' id='uploadAssetFile' name='uploadAssetFile' onchange=\"eventManager.fire('studentAssetSubmitUpload')\"></input>"
			+ "<img id='assetProcessing' style='display:none;' class='loadingImg' src=" + contextPath + "'/vle/images/ajax-loader.gif' alt='loading...' /></div><br>"
			+ "<div id='notificationDiv'>"
			+ "</div></div><div><div style='margin-bottom: 0.5em;'>"+this.getI18NString("student_assets_my_files")+": </div>"
			+ "<select id='assetSelect' style='width:100%; height:200px; padding:.5em;' size='15'></select>"
			+ "<div id='sizeDiv' style='margin-top: 0.5em; font-size: 0.9em;'></div><div id='uploaderInstructions'></div>"
			+ "</div></div>";
		$('#studentAssetsDiv').html(assetEditorDialogHtml);		
	}

	var remove = function(){
		var parent = document.getElementById('assetSelect');
		var ndx = parent.selectedIndex;
		if(ndx!=-1){
			var opt = parent.options[parent.selectedIndex];
			var name = opt.value;

			var success = function(text, xml, o){
				if(text.status==401){
					xml.notificationManager.notify(this.getI18NString("student_assets_remove_file_warning"),3, 'uploadMessage', 'notificationDiv');
				} else {
					parent.removeChild(opt);
					o.notificationManager.notify(text, 3, 'uploadMessage', 'notificationDiv');

					/* call upload asset with 'true' to get new total file size for assets */
					o.checkStudentAssetSizeLimit();
				}
			};
			view.connectionManager.request('POST', 1, view.getConfig().getConfigParam("studentAssetManagerURL"), {forward:'assetmanager', command: 'remove', asset: name, cmd: 'studentAssetUpload'}, success, view, success);
		}
	};
	
	var addToPortfolio = function() {
		if (view.getProjectMetadata().tools.isPortfolioEnabled && view.portfolio) {
			var parent = document.getElementById('assetSelect');
			var ndx = parent.selectedIndex;
			if(ndx!=-1){
				var opt = parent.options[parent.selectedIndex];
				var filename = opt.value;

				var postStudentAssetUrl = view.getConfig().getConfigParam("studentAssetManagerURL");
				// need to get rid of the ?type=StudentAssets&runId=X from the url because we're doing a POST and it will be syntactically incorrect.
				if (postStudentAssetUrl.indexOf("?") != -1) {
					postStudentAssetUrl = postStudentAssetUrl.substr(0,postStudentAssetUrl.indexOf("?"));
				}

				// need to make a copy of the asset in the referenced folder and use it instead of the original.
				$.ajax({
					url:postStudentAssetUrl,
					type:"POST",
					dataType:"json",
					data:{
						"type":"studentAssetManager",			
						"runId":view.config.getConfigParam("runId"),
						"forward":"assetmanager",
						"command":"studentAssetCopyForReference",
						"assetFilename":filename
					},
					success:function(responseJSON) {
						if (responseJSON != null && responseJSON.result != "" && responseJSON.result == "SUCCESS") {
							var newFilename = responseJSON.newFilename;
							var fileWWW = view.getAbsoluteRemoteStudentReferencedUploadsPath() + newFilename;	// make absolute path to file: http://studentuploadsBaseWWW/runId/workgroupId/unreferenced/filename
							view.portfolio.addStudentUploadedAssetItem(newFilename,fileWWW);
						} else {
							view.notificationManager.notify(view.getI18NString("student_assets_import_failure_message"),3, 'uploadMessage', 'notificationDiv');
						}
					}
				}
				);
			}
		}
	};

	var done = function(){
		$('#studentAssetsDiv').dialog('close');			
	};

	var show = function(){
		eventManager.fire('browserResize');
	};
	var addSelectedFileText = this.getI18NString("student_assets_add_selected_file");
	var deleteSelectedFileText = this.getI18NString("student_assets_delete_selected_file");
	var doneText = this.getI18NString("done");
	var insertImageText = this.getI18NString("insertImage")
	$('#studentAssetsDiv').dialog({autoOpen:false,closeText:'',resizable:false,width:600,show:{effect:"fade",duration:200},hide:{effect:"fade",duration:200},modal:false,title:this.getI18NString("student_assets_my_files"), 
		buttons:[{text:deleteSelectedFileText,click:remove},{text:doneText,click:done}]});

	/*
	 * check if the div is hidden before trying to open it.
	 * if it's already open, we don't have to do anything
	 */
	if($('#studentAssetsDiv').is(':hidden')) {
		//open the dialog
		$('#studentAssetsDiv').dialog('open');
		this.checkStudentAssetSizeLimit();
	};	

	/**
	 * Populate the student assets in the student assets popup
	 * @param names the names of the student asset files
	 * @param args additional args passed to this function
	 */
	var studentAssetsPopulateOptions = function(assets, args){
		var thisView = args.thisView;
		
		/*
		 * if a file was just uploaded and we are refreshing the list of student
		 * asset files, get the filename of the file that was just uploaded
		 */
		var filename = args.filename;

		if (assets && assets!='') {
			var parent = $('#assetSelect');
			parent.html('');

			//create a JSON array containing just the asset names
			var assets = JSON.parse(assets);
			
			var names = [];
			for (var a = 0; a < assets.length; a++) {
			    var asset = assets[a];
			    var assetFilename = asset.fileName;
			    names.push(assetFilename);
			}

			//sort the file names alphabetically
			names.sort(view.sortAlphabetically);

			//loop through all the file names and add an option for each file
			for(var x=0; x<names.length; x++) {
				var name = names[x];
				var opt = createElement(document, 'option', {name: 'assetOpt', id: 'asset_' + name});
				opt.text = name;
				opt.value = name;
				parent.append(opt);
				
				if(filename != null && filename == name) {
					//highlight the file that was just uploaded
					$(opt).attr('selected', true);
				}
			}
		}

		$('#uploadAssetFile').val('');
		$('#studentAssetEditorDialog').show();
		thisView.checkStudentAssetSizeLimit();
	};

	// show different sets of buttons based on current step and WISE configuration
	var buttonsArray = [];
	
	if (this.getProjectMetadata().tools.isPortfolioEnabled && this.portfolio) {
		// if portfolio is enabled for this run, let student upload assets to it
		buttonsArray.push({text:this.getI18NString("student_assets_add_selected_file_to_portfolio"),click:addToPortfolio});
	}
	
	if(this.getCurrentNode() != null &&
			this.getCurrentNode().importFile) {
		// if the currently-opened node supports file import, show file import button
		buttonsArray.push({text:addSelectedFileText,click:this.saImport});
	} else if (view.assetEditorParams && view.assetEditorParams.type) {
		buttonsArray.push({text:insertImageText,click:insertImage});
	} else {
		// use default set of buttons (remove and done)
	}
	// add default buttons
	buttonsArray.push({text:deleteSelectedFileText,click:remove});
	buttonsArray.push({text:doneText,click:done});
	$( "#studentAssetsDiv" ).dialog( "option", "buttons", buttonsArray);

	var filename = null;
	
	if(params != null) {
		/*
		 * add the filename to the params so we can highlight it when we
		 * list the assets
		 */
		filename = params.filename;		
	}
	
	this.connectionManager.request('GET', 1, this.getConfig().getConfigParam("studentAssetManagerURL"), {forward:'assetmanager', command: 'assetList', type: 'studentAssetManager'}, function(txt,xml,args){studentAssetsPopulateOptions(txt,args);}, {thisView:this,filename:filename});
};

/**
 * The student has chosen a student asset to import into the current step
 * @param params (optional) additional arguments for this function. if a file
 * was just imported, the filename of the file can be found in the params.
 * this will be used instead of looking at the highlighted option in the
 * select box. when the student uploads a file to import into the step, we 
 * will import it immediately after the file is uploaded instead of requiring 
 * the student to select the file again in the select box.
 */
View.prototype.saImport = function(params) {
	if(view.getCurrentNode() != null &&
			view.getCurrentNode().importFile) {			
		var parent = document.getElementById('assetSelect');
		var ndx = parent.selectedIndex;
		var filename = null;
		
		if(params != null) {
			//get the filename from the params
			filename = params.filename;
		}
		
		if(ndx!=-1 || filename != null){
			
			if(filename == null && ndx != -1) {
				//filename was not provided so we will get the selected option in the select box
				var opt = parent.options[parent.selectedIndex];
				filename = opt.value;
			}

			var postStudentAssetUrl = view.getConfig().getConfigParam("studentAssetManagerURL");
			// need to get rid of the ?type=StudentAssets&runId=X from the url because we're doing a POST and it will be syntactically incorrect.
			if (postStudentAssetUrl.indexOf("?") != -1) {
				postStudentAssetUrl = postStudentAssetUrl.substr(0,postStudentAssetUrl.indexOf("?"));
			}

			// need to make a copy of the asset in the referenced folder and use it instead of the original.
			$.ajax({
				url:postStudentAssetUrl,
				type:"POST",
				dataType:"json",
				data:{
					"type":"studentAssetManager",			
					"runId":view.config.getConfigParam("runId"),
					"forward":"assetmanager",
					"command":"studentAssetCopyForReference",
					"assetFilename":filename
				},
				success:function(responseJSON) {
					if (responseJSON != null && responseJSON.result != "" && responseJSON.result == "SUCCESS") {
						var newFilename = responseJSON.newFilename;
						var fileWWW = view.getAbsoluteRemoteStudentReferencedUploadsPath() + newFilename;	// make absolute path to file: http://studentuploadsBaseWWW/runId/workgroupId/unreferenced/filename
						if(view.getCurrentNode().importFile(fileWWW)) {
							view.notificationManager.notify(view.getI18NString("student_assets_import_success_message")+": " + newFilename, 3, 'uploadMessage', 'notificationDiv');
							$('#studentAssetsDiv').dialog('close');	
						} else {
							view.notificationManager.notify(view.getI18NString("student_assets_import_failure_message"),3, 'uploadMessage', 'notificationDiv');
						}
					} else {
						view.notificationManager.notify(view.getI18NString("student_assets_import_failure_message"),3, 'uploadMessage', 'notificationDiv');
					}
				}
			}
			);
		}
	}
};

/**
 * Check to make sure that student has not exceeded upload size limit. 
 */
View.prototype.checkStudentAssetSizeLimit = function(){
	var callback = function(text, xml, o){
		o.currentAssetSize = text;
		if(text >= o.MAX_ASSET_SIZE){
			var maxUploadSize = o.utils.appropriateSizeText(o.MAX_ASSET_SIZE);
			var studentUsageSize = o.utils.appropriateSizeText(text);
			var maxExceededMessage = o.getI18NStringWithParams("student_assets_student_usage_exceeded_message",[maxUploadSize,studentUsageSize]);
			o.notificationManager.notify(maxExceededMessage, 3, 'uploadMessage', 'notificationDiv');
		} else {				
			var studentUsage = o.utils.appropriateSizeText(text);
			var maxUsageLimit = o.utils.appropriateSizeText(o.MAX_ASSET_SIZE);
			//$('#sizeDiv').html(o.getI18NStringWithParams("student_assets_student_usage_message",[studentUsage,maxUsageLimit]));
		} 
	};
	this.connectionManager.request('GET', 1,  this.getConfig().getConfigParam("studentAssetManagerURL"), {forward:'assetmanager', command: 'getSize', type: 'studentAssetManager'}, callback, this);
};

/**
 * Performs student asset upload
 */
View.prototype.studentAssetSubmitUpload = function() {
	if (this.currentAssetSize != null) {
		if (this.currentAssetSize >= this.MAX_ASSET_SIZE) {
			notificationManager.notify('You cannot upload this file because you have exceeded your upload limit. Please delete some files first and try again.', 3, 'uploadMessage', 'notificationDiv');
			return;
		}
	};
	var filename = $('#uploadAssetFile').val();
	var view = this;
	if(filename && filename != ''){
		filename = filename.replace("C:\\fakepath\\", "");  // chrome/IE8 fakepath issue: http://acidmartin.wordpress.com/2009/06/09/the-mystery-of-cfakepath-unveiled/	
		if(!view.utils.fileFilter(view.allowedStudentAssetExtensions,filename)){
			view.notificationManager.notify('Sorry, the specified file type is not allowed.', 3, 'uploadMessage', 'notificationDiv');
			return;
		} else {
			var frameId = 'assetUploadTarget_' + Math.floor(Math.random() * 1000001);
			var frame = createElement(document, 'iframe', {id:frameId, type:'student', name:frameId, src:'about:blank', style:'display:none;'});
			var studentAssetManagerURL = this.getConfig().getConfigParam("studentAssetManagerURL");
			// need to get rid of the ?type=StudentAssets&runId=X from the url because we're doing a POST and it will be syntactically incorrect.
			if (studentAssetManagerURL.indexOf("?") != -1) {
				studentAssetManagerURL = studentAssetManagerURL.substr(0,studentAssetManagerURL.indexOf("?"));
			}
			var form = createElement(document, 'form', {id:'assetUploaderFrm', method:'POST', enctype:'multipart/form-data', action:studentAssetManagerURL, target:frameId, style:'display:none;'});

			/* create and append elements */
			document.body.appendChild(frame);
			document.body.appendChild(form);

			form.appendChild(createElement(document,'input',{type:'hidden', name:'type', value:'studentAssetManager'}));
			form.appendChild(createElement(document,'input',{type:'hidden', name:'runId', value:this.config.getConfigParam("runId")}));
			form.appendChild(createElement(document,'input',{type:'hidden', name:'forward', value:'assetmanager'}));
			form.appendChild(createElement(document,'input',{type:'hidden', name:'command', value:'uploadAsset'}));

			/* set up the event and callback when the response comes back to the frame */
			frame.addEventListener('load', function () { eventManager.fire('assetUploaded', [frame, view, filename]); }, false);

			/* change the name attribute to reflect that of the file selected by user */
			document.getElementById('uploadAssetFile').setAttribute("name", filename);

			/* remove file input from the dialog and append it to the frame before submitting, we'll put it back later */
			var fileInput = document.getElementById('uploadAssetFile');
			form.appendChild(fileInput);

			/* submit hidden form */
			form.submit();

			/* put the file input back and remove form now that the form has been submitted */
			document.getElementById('assetUploaderBodyDiv').insertBefore(fileInput, document.getElementById('assetUploaderBodyDiv').firstChild);
			document.body.removeChild(form);

			$('#assetProcessing').show();
		}
	} else {
		view.notificationManager.notify('Please specify a file to upload.',3, 'uploadMessage', 'notificationDiv');
	}
};


/**
 * Calculate and set the gradebyteam statistics
 * @return number percentage of the project this team has completed
 */
View.prototype.getTeamProjectCompletionPercentage = function() {
	/*
	 * get all the leaf nodes in the project except for HtmlNodes
	 * this is a : delimited string of nodeIds
	 */
	var nodeIds = this.getProject().getNodeIds();

	//get the run id
	var runId = this.getConfig().getConfigParam('runId');


	//get a vleState
	var vleState = this.getState();

	//get the workgroup id
	var workgroupId = vleState.dataId;

	//the number of steps the current workgroupId has completed
	var numStepsCompleted = 0;

	//loop through all the nodeIds
	for(var y=0; y<nodeIds.length; y++) {
		var nodeId = nodeIds[y];

		//get the latest work for the current workgroup (empty or not)
		var latestNodeVisit = vleState.getLatestNodeVisitByNodeId(nodeId);

		//check if there was any work
		if (latestNodeVisit != null) {
			//student has completed this step so we will increment the counter
			numStepsCompleted++;
		}
	}

	//for the current team, calculate the percentage of the project they have completed
	var teamPercentProjectCompleted = Math.floor((numStepsCompleted / nodeIds.length) * 100);

	return teamPercentProjectCompleted;	
};

/**
 * Returns true iff specified nodeVisit exists in postInProgressArray
 * @param nodeVisit
 */
View.prototype.isInPOSTInProgressArray = function(nodeVisit) {
	if (this.postInProgressArray == null) {
		return false;
	}
	for (var i=0; i < this.postInProgressArray.length; i++) {
		var nodeVisitToCheck = this.postInProgressArray[i];
		if ($.stringify(nodeVisit) == $.stringify(nodeVisitToCheck)) {
			return true;
		}
	}
	return false;
};

/**
 * Add specified nodeVisit to postInProgressArray
 * If nodeVisit exists in the postInProgressArray, do nothing
 * @param nodeVisit
 */
View.prototype.addToPOSTInProgressArray = function(nodeVisit) {
	if (this.postInProgressArray == null) {
		this.postInProgressArray = [];
	}
	if (!this.isInPOSTInProgressArray(nodeVisit)) {
		this.postInProgressArray.push(nodeVisit);		
	}
};

/**
 * Removes specified nodeVisit from postInProgressArray
 * If nodeVisit does not exist in the postInProgressArray, do nothing
 * @param nodeVisit
 */
View.prototype.removeFromPOSTInProgressArray = function(nodeVisit) {
	if (this.postInProgressArray == null) {
		return;
	}
	for (var i=0; i < this.postInProgressArray.length; i++) {
		var nodeVisitToCheck = this.postInProgressArray[i];
		if ($.stringify(nodeVisit) == $.stringify(nodeVisitToCheck)) {
			this.postInProgressArray.splice(i,1);
		}
	}
};

/**
 * Invokes the CRater while the user is in preview mode
 * 
 * with a GET request and returns an Annotation with the CRater score/response.
 * @param nodeId id of current step
 * @param cRaterItemType [CRATER,HENRY]
 * @param cRaterItemId [GREENROOF-II,SPOON,...]
 * @param cRaterRequestType [scoring,verify]
 * @param cRaterResponseId ID to keep track of this crater request
 * @param successCallback
 * @param failureCallback
 * @param callbackData the data to be made available in the callback function
 * @param sync whether the request should be synchronous
 * @param timeout the timeout for the request in milliseconds
 */
View.prototype.invokeCRaterInPreviewMode = function(cRaterItemType,cRaterItemId,cRaterRequestType,cRaterResponseId,studentData,successCallback,failureCallback,callbackData, sync, timeout) {
	var cRaterRequestURL = this.getConfig().getConfigParam('cRaterRequestURL');

	var cRaterArgs = {
			cRaterItemType:cRaterItemType,
			itemId:cRaterItemId,
			cRaterRequestType:cRaterRequestType,
			responseId:cRaterResponseId,
			studentData:studentData,
			wiseRunMode:"preview"
	};
	
	//make the call to GET the annotation
	this.connectionManager.request('GET', 1, cRaterRequestURL, cRaterArgs, successCallback, callbackData, failureCallback, sync, timeout);
};

/**
 * Make a request to GET the CRater response. This invokes the VLEAnnotationController
 * with a GET request and returns an Annotation with the CRater score/response.
 * @param stepWorkId
 * @param nodeStateId
 */
View.prototype.getCRaterResponse = function(stepWorkId, nodeStateId, cRaterItemType) {
	var annotationsURL = this.getConfig().getConfigParam('annotationsURL');

	var getCRaterResponseArgs = {
			stepWorkId:stepWorkId,
			nodeStateId:nodeStateId,
			annotationType:"cRater",
			cRaterItemType:cRaterItemType
	};

	//make the call to GET the annotation
	this.connectionManager.request('GET', 1, annotationsURL, getCRaterResponseArgs, this.getCRaterResponseCallback, [this, stepWorkId, nodeStateId], this.getCRaterResponseCallbackFail);
};

/**
 * Success callback for the CRater Annotation request. Displays the Annotation immediately
 * if specified in the callee's step content.
 * @param responseText
 * @param responseXML
 * @param args
 */
View.prototype.getCRaterResponseCallback = function(responseText, responseXML, args) {
	if (responseText != null) {
		try {
			var annotationJSON = JSON.parse(responseText);
			var nodeId = annotationJSON.nodeId;
			
			// display feedback immediately, if specified in the content
			var vle = args[0];
			var nodeStateId = args[2];
			
			// check the step content to see if we need to display the CRater feedback to the student.
			var cRaterJSON = vle.getProject().getNodeById(nodeId).content.getContentJSON().cRater;

			//var displayCRaterFeedbackImmediately = cRaterJSON.displayCRaterFeedbackImmediately;
			var displayCRaterScoreToStudent = cRaterJSON.displayCRaterScoreToStudent;
			var displayCRaterFeedbackToStudent = cRaterJSON.displayCRaterFeedbackToStudent;

			var cRaterAnnotationJSON = vle.getCRaterNodeStateAnnotationByNodeStateId(annotationJSON,nodeStateId);
			var cRaterAnnotation = Annotation.prototype.parseDataJSONObj(annotationJSON);

			//add the CRater annotation to our local collection of annotations
			vle.getAnnotations().updateOrAddAnnotation(cRaterAnnotation);

			if (displayCRaterScoreToStudent || displayCRaterFeedbackToStudent) {
				//we will display the score or feedback (or both) to the student

				var concepts = cRaterAnnotationJSON.concepts;

				// now find the feedback that the student should see
				var scoringRules = cRaterJSON.cRaterScoringRules;
				
				//get the score the student received
				var score = cRaterAnnotationJSON.score;
				
				var cRaterItemType = null;
				
				if(cRaterAnnotationJSON.studentResponse != null) {
					var studentResponse = cRaterAnnotationJSON.studentResponse;
					
					//get the crater item type e.g. 'CRATER' or 'HENRY'
					cRaterItemType = studentResponse.cRaterItemType;
				}

				//get the feedback for the given concepts the student satisfied
				var feedbackTextObject = vle.getCRaterFeedback(scoringRules, concepts, score, cRaterItemType);

				//get the feedback text and feedback id
				var feedbackText = feedbackTextObject.feedbackText;
				var feedbackId = feedbackTextObject.feedbackId;

				var message = "";

				if(displayCRaterScoreToStudent) {
					//display the score
					message += "You got a score of " + score;
				}

				if(displayCRaterFeedbackToStudent) {
					//display the feedback
					if(displayCRaterScoreToStudent) {
						message += "\n";
					}

					message += "Feedback: " + feedbackText;

					/*
					 * we are displaying the CRater feedback to the student so we will
					 * update the node state with the CRater feedback so we know which
					 * feedback the student received.
					 */

					//get the current node visit
					var currentNodeVisit = vle.getState().getCurrentNodeVisit();

					//get the current node state
					var latestNodeState = currentNodeVisit.getLatestState();

					//insert the feedback text, feedback id, and feedback score into the node state
					latestNodeState.cRaterFeedbackText = feedbackText;
					latestNodeState.cRaterFeedbackId = feedbackId;
					latestNodeState.cRaterScore = score;

					/*
					 * save the current node visit again so the stepwork row in the 
					 * database will be updated to include the feedback text and feedback id
					 */
					vle.postCurrentNodeVisit();
				}

				if(message != null && message != "") {
					//popup the message to the student
					eventManager.fire("showNodeAnnotations",[nodeId]);
				}
			}
			
			//fire the 'cRaterResponseReceived' event
			eventManager.fire("cRaterResponseReceived",[nodeId, annotationJSON]);
		} catch(err) {
			/*
			 * failed to parse JSON. this can occur if the item id is invalid which
			 * causes an error to be returned from the server instead of the JSON
			 * that we expect.
			 */
		}
	}
	
	/*
	 * unlock the screen since we previously locked it to make the student wait
	 * for the feedback to be displayed
	 */
	eventManager.fire('unlockScreenEvent');
};

/**
 * Returns the specified NodeState annotation object within the stepwork cRater annotation object
 */
View.prototype.getCRaterNodeStateAnnotationByNodeStateId = function(cRaterAnnotationJSON, nodeStateId) {
	var annotationValues = cRaterAnnotationJSON.value;
	for (var i=0; i < annotationValues.length; i++) {
		var annotationValue = annotationValues[i];
		if (annotationValue.nodeStateId == nodeStateId) {
			return annotationValue;
		}
	}
	return null;
};

/**
 * Error callback for the CRater Annotation request.
 * @param responseText
 * @param responseXML
 * @param args
 */
View.prototype.getCRaterResponseCallbackFail = function(responseText, responseXML, args) {
	//console.log("fail");
	//console.log(responseText);
};

/**
 * Gets called when student work is updated and the studentWorkUpdated event
 * is fired.
 */
View.prototype.studentWorkUpdatedListener = function() {
	//update the constraints
	this.updateConstraints();
};

/**
 * Update the constraints. Add any constraints that are no longer
 * satisfied. Remove any constraints that have been satisfied.
 */
View.prototype.updateConstraints = function() {
	this.addGlobalTagMapConstraints();
	this.updateActiveTagMapConstraints();
	this.updateSequenceStatuses();
};

/**
 * Get the time spent on a node id
 * @param nodeId the node id
 * @returns the number of seconds spent on the node id
 */
View.prototype.getTimeSpentOnNodeId = function(nodeId) {
    var timeSpentOnNodeId = 0;
    
    // get all the node visits for a node id
    var nodeVisitsByNodeId = this.getState().getNodeVisitsByNodeId(nodeId);
    
    if (nodeVisitsByNodeId != null) {
        
        // loop through all the node visits
        for (var n = 0; n < nodeVisitsByNodeId.length; n++) {
            var nodeVisit = nodeVisitsByNodeId[n];
            
            if (nodeVisit != null) {
                // get the start and end time
                var visitStartTime = nodeVisit.visitStartTime;
                var visitEndTime = nodeVisit.visitEndTime;
                
                if (visitStartTime != null && visitEndTime != null) {
                    
                    // get the time difference
                    var nodeVisitTimeSpent = visitEndTime - visitStartTime;
                    
                    if (nodeVisitTimeSpent != null) {
                        
                        // accumulate the total time spent
                        timeSpentOnNodeId += nodeVisitTimeSpent;
                    }
                }
            }
        }
    }
    
    // get the current node visit
    var currentNodeVisit = this.getState().getCurrentNodeVisit();
    
    if (currentNodeVisit != null) {
        if (nodeId === currentNodeVisit.nodeId) {
            // the current node visit is for the node id we are looking for
            
            // get the start and end time
            var visitStartTime = currentNodeVisit.visitStartTime;
            var visitEndTime = currentNodeVisit.visitEndTime;
            
            /*
             * we will only add the current node visit time if it does not have
             * an end time. if it has an end time, it would have already been
             * added in the for loop above
             */
            if (visitEndTime == null) {
                
                // get the current time
                var date = new Date();
                var currentTime = date.getTime();
                
                // find the time the student has spent on the current node visit
                var currentNodeVisitTime = currentTime - visitStartTime;
                
                // add the time to the total
                timeSpentOnNodeId += currentNodeVisitTime;
            }
        }
    }
    
    // get the time spent in seconds
    timeSpentOnNodeId = Math.floor(timeSpentOnNodeId / 1000);
    
    return timeSpentOnNodeId;
};

//used to notify scriptloader that this script has finished loading
if(typeof eventManager != 'undefined'){
	eventManager.fire('scriptLoaded', 'vle/view/student/studentview_studentwork.js');
};