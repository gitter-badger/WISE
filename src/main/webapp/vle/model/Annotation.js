/**
 * An object that represents one annotation. A comment by itself is considered
 * one annotation. The grade is also considered one annotation by itself. This
 * means if the teacher writes a comment and a grade, the teacher will be
 * creating two annotations.
 */

/**
 * Constructor
 */
function Annotation(runId, nodeId, toWorkgroup, fromWorkgroup, type, value, postTime, stepWorkId) {
	this.runId = runId;
	this.nodeId = nodeId; //the node/step related to this annotation
	this.toWorkgroup = toWorkgroup; //the id for the entity that wrote the work
	this.fromWorkgroup = fromWorkgroup; //the id for the entity that is writing feedback/grading
	this.type = type; //specifies the type of annotation
	this.value = value; //the feedback/grading
	this.postTime = postTime;
	this.stepWorkId = stepWorkId;
	
	try {
		this.value = JSON.parse(value);
	} catch(err) {
		
	}
}

/**
 * Converts an annotation JSON String into an Annotation object
 * @param annotationJSONString an annotation JSON string
 * @return a populated Annotation object
 */
Annotation.prototype.parseDataJSONString = function(annotationJSONString) {
	//convert the JSON string into a JSON object
	var annotationJSONObj = $.parseJSON(annotationJSONString);
	
	//convert the annotation JSON object into an Annotation object
	return Annotation.prototype.parseDataJSONObj(annotationJSONObj);
}


/**
 * Creates an Annotation object from an annotation JSON object
 * @param annotationJSONObj an annotation JSON object
 * @return an Annotation object
 */
Annotation.prototype.parseDataJSONObj = function(annotationJSONObj) {
	//create a new Annotation
	var annotation = new Annotation();
	
	//populate the fields of the Annotation object from the JSON object
	annotation.runId = annotationJSONObj.runId;
	annotation.nodeId = annotationJSONObj.nodeId;
	annotation.toWorkgroup = annotationJSONObj.toWorkgroup;
	annotation.fromWorkgroup = annotationJSONObj.fromWorkgroup;
	annotation.type = annotationJSONObj.type;
	annotation.value = annotationJSONObj.value;
	annotation.postTime = annotationJSONObj.postTime;
	annotation.stepWorkId = annotationJSONObj.stepWorkId;
	
	//only used when student retrieves flagged work
	if(annotationJSONObj.data) {
		annotation.data = NODE_VISIT.prototype.parseDataJSONObj(annotationJSONObj.data);	
	}
	
	//only used when student retrieves flagged work
	if(annotationJSONObj.annotationComment) {
		annotation.annotationComment = Annotation.prototype.parseDataJSONObj(annotationJSONObj.annotationComment);
	}
	
	try {
		annotation.value = JSON.parse(annotationJSONObj.value);
	} catch(err) {
		
	}
	
	//return the Annotation
	return annotation;
}

/**
 * An object that contains Annotation objects 
 */
function Annotations() {
	this.annotationsArray = new Array();
}

/**
 * Adds the Annotation object to its array 
 * @param annotation an Annotation object
 */
Annotations.prototype.addAnnotation = function(annotation) {
	this.annotationsArray.push(annotation);
};

/**
 * Receives a new Annotation object and looks through all the current
 * Annotations to see if there is already one that has the same
 * runId
 * nodeId
 * toWorkgroup
 * fromWorkgroup
 * type
 * stepWorkId
 * If it finds one that is the same, it will remove the old Annotation
 * and add the new Annotation.
 * 
 * If it does not find a match, it will just add the new Annotation.
 * 
 * @param newAnnotation the new annotation object to update or add
 */
Annotations.prototype.updateOrAddAnnotation = function(newAnnotation) {
	//flag to see if we have found an existing annotation and have updated it
	var annotationUpdated = false;
	
	//loop through all the annotations
	for(var x=0; x<this.annotationsArray.length; x++) {
		//get an annotation
		var annotation = this.annotationsArray[x];
		
		//see if the annotation is for the same set of parameters
		if(annotation.runId == newAnnotation.runId &&
				annotation.nodeId == newAnnotation.nodeId &&
				annotation.toWorkgroup == newAnnotation.toWorkgroup &&
				annotation.fromWorkgroup == newAnnotation.fromWorkgroup &&
				annotation.type == newAnnotation.type &&
				annotation.stepWorkId == newAnnotation.stepWorkId) {
			//the parameters are the same so we will remove the annotation we found
			this.annotationsArray.splice(x, 1);
			
			//add the new annotation
			this.addAnnotation(newAnnotation);
			
			//set the update flag to true
			annotationUpdated = true;
			
			break;
		}
	}
	
	//see if we updated
	if(!annotationUpdated) {
		//we did not update so we will need to add the new annotation
		this.addAnnotation(newAnnotation);
	}
	
};

Annotations.prototype.removeAnnotation = function(runId, nodeId, toWorkgroup, fromWorkgroup, studentWork) {
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.runId == runId &&
				annotation.nodeId == nodeId &&
				annotation.toWorkgroup == toWorkgroup &&
				annotation.fromWorkgroup == fromWorkgroup &&
				annotation.studentWork == studentWork) {
			this.annotationsArray.splice(x, 1);
		}
	}
};

Annotations.prototype.removeFlagAnnotation = function(runId, nodeId, toWorkgroup, fromWorkgroup) {
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.runId == runId &&
				annotation.nodeId == nodeId &&
				annotation.toWorkgroup == toWorkgroup &&
				annotation.fromWorkgroup == fromWorkgroup) {
			this.annotationsArray.splice(x, 1);
		}
	}
};

/**
 * Converts a JSON string into an Annotations object
 * @param annotationsJSONString a JSON string representing an Annotations object
 * @return an Annotations object
 */
Annotations.prototype.parseDataJSONString = function(annotationsJSONString, insertStepLinks, vle) {
	
	if(insertStepLinks) {
		//replace all the instances of 'Step X' with a link to 'Step X'
		annotationsJSONString = this.insertStepLinks(annotationsJSONString, vle);
	}
	
	//convert the JSON string into a JSON object
	var annotationsJSONObj = $.parseJSON(annotationsJSONString);
	
	//create an Annotations object from the JSON object
	return Annotations.prototype.parseDataJSONObj(annotationsJSONObj);
};

/**
 * Replace all the instances of 'Step X' with a link to 'Step X'. We will
 * perform this by traversing through the old annotations JSON string and cutting 
 * and moving the text into our new annotations JSON string. Whenever we find an 
 * instance of 'Step X' we will replace that with a link to the step in the vle.
 * @param annotationsJSONString the annotation JSON string
 * @param vle the vle so we can check if step numbers exist in the project
 * @returns the annotation JSON string with all the instances
 * of 'Step X' replaced with a link to 'Step X'
 */
Annotations.prototype.insertStepLinks = function(annotationsJSONString, vle) {
	//will be used to accumulate the new annotations JSON string
	var newAnnotationsJSONString = '';
	
	//will be used to hold the old annotations JSON string
	var oldAnnotationsJSONString = annotationsJSONString;
	
	/*
	 * a pattern to match 'Step x.x'
	 * this will match lower and uppercase 'Step' and an unlimited number of .x
	 * here are some examples of what it will match 
	 * Step 1.1
	 * step 1.1
	 * sTeP 1.1
	 * Step 1.1.1
	 * Step 1.1.1.1
	 */
	var pattern = /Step (\d+(?:\.\d+)*)/i;
	
	//find the first pattern match
	var position = oldAnnotationsJSONString.search(pattern);
	
	//keep looping as long as we have found a match
	while(position != -1) {
		//get the match
		var match = oldAnnotationsJSONString.match(pattern);
		
		//get the whole match e.g. Step 1.1
		var wholeMatch = match[0];
		
		//get the step number group match e.g. 1.1
		var stepNumber = match[1];
		
		//split the step number string by the .
		var stepNumberParts = stepNumber.split('.');
		
		var vleStepNumber = '';
		
		if(stepNumberParts != null) {
			//loop through all the step number parts
			for(var y=0; y<stepNumberParts.length; y++) {
				//get a step number part
				var stepNumberPart = stepNumberParts[y];
				
				//decrement the step number part by 1 to get the vle step number
				var vleStepNumberPart = parseInt(stepNumberPart) - 1;
				
				if(vleStepNumber != '') {
					//add a . between all the vle step number parts
					vleStepNumber += '.';
				}
				
				//prepend the vle step number part
				vleStepNumber += vleStepNumberPart;
			}
		}
		
		//add everything before the match we found
		newAnnotationsJSONString += oldAnnotationsJSONString.substring(0, position);
		
		if(vle == null) {
			//vle was not passed in so we will display a link regardless of whether the step really exists or not
			newAnnotationsJSONString += "<a onclick='eventManager.fire(\\\"nodeLinkClicked\\\", \\\"" + vleStepNumber + "\\\")'>" + wholeMatch + "</a>";
		} else {
			//the vle was passed in so we will try to obtain the node at the vle step number position
			var node = vle.getProject().getNodeByPosition(vleStepNumber);
			
			if(node == null) {
				//node does not exist so we will just display the text
				newAnnotationsJSONString += wholeMatch;
			} else {
				//node exists so we will display a link
				newAnnotationsJSONString += "<a onclick='eventManager.fire(\\\"nodeLinkClicked\\\", \\\"" + vleStepNumber + "\\\")'>" + wholeMatch + "</a>";				
			}
		}
		
		//cut the old string down to remove everything we have just moved over to the new annotations JSON string
		oldAnnotationsJSONString = oldAnnotationsJSONString.substring(position + wholeMatch.length);
		
		//try to find the position of the next match
		position = oldAnnotationsJSONString.search(pattern);
	}
	
	//add anything that is remaining in the old annotations JSON string
	newAnnotationsJSONString += oldAnnotationsJSONString;
	
	return newAnnotationsJSONString;
};

/**
 * Converts a JSON object into an Annotations object
 * @param annotationsJSONObj a JSON object representing an Annotations object
 * @return an Annotations object
 */
Annotations.prototype.parseDataJSONObj = function(annotationsJSONObj) {
	//create a new Annotations object
	var annotations = new Annotations();
	
	//the array to store the annotation objects
	annotations.annotationsArray = new Array();
	
	//loop through the annotation JSON objects and create Annotation objects
	if (annotationsJSONObj.annotationsArray != null) {
		for(var x=0; x<annotationsJSONObj.annotationsArray.length; x++) {
			//obtain an annotation JSON object
			var annotationJSONObj = annotationsJSONObj.annotationsArray[x];

			//create an Annotation object
			var annotationObj = Annotation.prototype.parseDataJSONObj(annotationJSONObj);

			//add the Annotation object to the annotationsArray
			annotations.annotationsArray.push(annotationObj);
		}
	}
	
	//return the populated Annotations object
	return annotations;
};


/**
 * Retrieves the latest annotation for the given nodeId
 * @param nodeId the nodeId to retrieve the annotation for
 * @return the latest annotation for the nodeId or null if none are found
 * 		for the nodeId
 */
Annotations.prototype.getLatestAnnotationForNodeId = function(nodeId) {
	var annotation = null;
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		tempAnnotation = this.annotationsArray[x];
		
		if(tempAnnotation.nodeId == nodeId) {
			annotation = tempAnnotation;
		}
	}
	
	return annotation;
};

/**
 * Retrieves all the annotations for a nodeId
 * @param nodeId the nodeId to retrieve annotations for
 * @return an array containing the annotations for the nodeId
 */
Annotations.prototype.getAnnotationsByNodeId = function(nodeId) {
	var annotations = new Array();
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.nodeId == nodeId) {
			annotations.push(annotation);
		}
	}
	
	return annotations;
};

/**
 * Retrieves all the annotations for a nodeId and type
 * @param nodeId the nodeId to retrieve annotations for
 * @param type the annotation type to retrieve annotations for
 * @return an array containing the annotations with the given node id and type
 */
Annotations.prototype.getAnnotationsByNodeIdType = function(nodeId, type) {
    var annotations = new Array();
    
    for(var x=0; x<this.annotationsArray.length; x++) {
        var annotation = this.annotationsArray[x];
        
        if(annotation.nodeId === nodeId && annotation.type === type) {
            annotations.push(annotation);
        }
    }
    
    return annotations;
};

/**
 * Retrieves all the annotations for the toWorkgroup (student workgroup)
 * @param toWorkgroup the student workgroup id
 * @return an array containing the annotations for the toWorkgroup
 */
Annotations.prototype.getAnnotationsByToWorkgroup = function(toWorkgroup) {
	var annotations = new Array();
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.toWorkgroup == toWorkgroup) {
			annotations.push(annotation);
		}
	}
	
	return annotations;
};

/**
 * Retrieves all the annotations with toWorkgroup and fromWorkgroup
 * @param toWorkgroup a student workgroup id
 * @param fromWorkgroups an array of teacher workgroup ids
 * @return an array containing the annotations for this combination
 */
Annotations.prototype.getAnnotationsByToWorkgroupAndFromWorkgroups = function(toWorkgroup, fromWorkgroups) {
	var annotations = new Array();
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		//check that the toWorkgroup matches and that the fromWorkgroup is in the array of fromWorkgroups
		if(annotation.toWorkgroup == toWorkgroup && fromWorkgroups.indexOf(parseInt(annotation.fromWorkgroup)) != -1) {
			annotations.push(annotation);
		}
	}
	
	return annotations;
};

/**
 * Returns an integer total score of all of the scores that the toWorkgroup
 * has retrieved.
 * @param toWorkgroup
 * @return the total score
 */
Annotations.prototype.getTotalScoreByToWorkgroup = function(toWorkgroup) {
	var annotationsByToWorkgroup=this.getAnnotationsByToWorkgroup(toWorkgroup);
	var totalSoFar = 0;
	for (var i=0; i < annotationsByToWorkgroup.length; i++) {
		if (annotationsByToWorkgroup[i].type == "score") {
			totalSoFar += parseFloat(annotationsByToWorkgroup[i].value);
		}
	}
	return totalSoFar;
};


/**
 * Returns an integer total score of all the scores that fromWorkgroup
 * has given to toWorkgroup
 * @param toWorkgroup a student workgroup id
 * @param fromWorkgroup a teacher workgroup id (or maybe student workgroup id)
 * @return the total score
 */
Annotations.prototype.getTotalScoreByToWorkgroupAndFromWorkgroups = function(toWorkgroup, fromWorkgroups) {
	return this.getTotalScoreAndTotalPossibleByToWorkgroupAndFromWorkgroups(toWorkgroup, fromWorkgroups, null).totalScore;
};


/**
 * Returns an object containing the total score of all the latest scores that fromWorkgroups
 * has given to toWorkgroup as well as the max total score for all of the steps
 * that were scored
 * @param toWorkgroup a student workgroup id
 * @param fromWorkgroup a teacher workgroup id (or maybe student workgroup id)
 * @param maxScores the max scores object that contains all the max scores entries
 * @return an object containing totalScore and maxPossible
 */
Annotations.prototype.getTotalScoreAndTotalPossibleByToWorkgroupAndFromWorkgroups = function(toWorkgroup, fromWorkgroups, maxScores) {
	var totalScoreAndTotalPossible = {};
	var annotationsByToWorkgroup = this.getAnnotationsByToWorkgroup(toWorkgroup);
	var totalSoFar = 0;
	var nodeIdsFoundAlready = new Array();
	var maxPossible = 0;
	
	//an object that will hold the nodeId to latest annotation for that nodeId mappings
	var latestAnnotations = {};
	
	//an array of nodeIds that we have found so far 
	var latestAnnotationNodeIds = [];
	
	//loop through all the annotations
	for(var x=0; x<annotationsByToWorkgroup.length; x++) {
		//get an annotation
		var tempAnnotation = annotationsByToWorkgroup[x];
		
		//check if it is a score annotation
		if (annotationsByToWorkgroup[x].type == "score" || annotationsByToWorkgroup[x].type == "autoGraded") {
			//get the nodeId for the annotation
			var nodeId = annotationsByToWorkgroup[x].nodeId;
			
			//get the latest annotation that we have found so far with the same nodeId
			var latestAnnotation = latestAnnotations[nodeId];
			
			//check if we have found an annotation with that nodeId before
			if(latestAnnotation) {
				//we have found an annotation with that nodeId before
				
				//check which one is newer
				if(latestAnnotation.postTime < tempAnnotation.postTime) {
					//the temp one we just found is newer so we will keep that one
					latestAnnotations[nodeId] = tempAnnotation;
				}
			} else {
				//we have not found an annotation with that nodeId before
				
				//remember this annotation
				latestAnnotations[nodeId] = tempAnnotation;
				
				//add the nodeId to our array to keep track of nodeIds we've found
				latestAnnotationNodeIds.push(nodeId);
			}
		}
	}
	
	//loop through the array of nodeIds we've found
	for(var y=0; y<latestAnnotationNodeIds.length; y++) {
		//get a nodeId
		var tempNodeId = latestAnnotationNodeIds[y];
		
		//get the latest annotation that we found for this nodeId
		var tempAnnotation = latestAnnotations[tempNodeId];
		
		//check that that annotation value is a number
		if(tempAnnotation != null && tempAnnotation.value != null && tempAnnotation.value != '' && !isNaN(tempAnnotation.value)) {
			//add the score to our current total
			totalSoFar += parseFloat(tempAnnotation.value);
			
			//check if the maxScores exists
			if(maxScores != null) {
				//get the max score possible for this nodeId and add it to our total
				maxPossible += parseFloat(maxScores.getMaxScoreValueByNodeId(tempNodeId));	
			}
		} else {
		    // the annotation is an auto graded annotation
		    var value = this.getLatestAnnotationValueFromValueArray(tempAnnotation, 'autoScore');
		    
		    if (value != null) {
		        // get the auto score and max auto score
		        var autoScore = value.autoScore;
		        var maxAutoScore = value.maxAutoScore;
		        
		        if (autoScore != null && maxAutoScore != null) {
		            totalSoFar += autoScore;
		            maxPossible += maxAutoScore;
		        }
		    }
		}
	}

	totalScoreAndTotalPossible.totalScore = totalSoFar;
	totalScoreAndTotalPossible.totalPossible = maxPossible;
	return totalScoreAndTotalPossible;
};



/**
 * Retrieves all the annotations for with the given nodeId and toWorkgroup
 * @param nodeId the id of the node
 * @param toWorkgroup the id of the student workgroup
 * @return an array containing the annotations with the nodeId and toWorkgroup
 */
Annotations.prototype.getAnnotationsByNodeIdAndToWorkgroup = function(nodeId, toWorkgroup) {
	var annotations = new Array();
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.nodeId == nodeId && annotation.toWorkgroup == toWorkgroup) {
			annotations.push(annotation);
		}
	}
	
	return annotations;
};

/**
 * Retrieves the latest annotation that matches all the parameters
 * @param runId the id of the run. If in preview mode, runId==""
 * @param nodeId the id of the node
 * @param toWorkgroup the id of the student workgroup
 * @param fromWorkgroups an array of workgroups that we want annotations from
 * @param type the type of annotation
 * @param field (optional) if a field is provided we will require the annotation 
 * to have an object in its value array that has the given field
 * e.g. 'autoScore' or 'autoFeedback'
 * @return the latest annotation that matches all the parameters
 */
Annotations.prototype.getLatestAnnotation = function(runId, nodeId, toWorkgroup, fromWorkgroups, type, stepWorkId, field) {
	var latestAnnotation = null;
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		var tempAnnotation = this.annotationsArray[x];
		
		/*
		 * we will check that the attributes match
		 * the tempAnnotation.fromWorkgroup must match any id in the fromWorkgroups array
		 * type can be null in which case any type will be accepted
		 * stepWorkId can be null in which case any stepWorkId will be accepted
		 */
		if((runId == "" || tempAnnotation.runId == runId) && 
				tempAnnotation.nodeId == nodeId &&
				tempAnnotation.toWorkgroup == toWorkgroup && 
				fromWorkgroups.indexOf(parseInt(tempAnnotation.fromWorkgroup)) != -1 &&
				(type == null || tempAnnotation.type == type) &&
				(field == null || this.annotationContainsField(tempAnnotation, field))) {

			//if stepWorkId was passed in, make sure it matches
			if(stepWorkId == null || (stepWorkId != null && tempAnnotation.stepWorkId == stepWorkId)) {
				//check if we have previously found a matching annotation
				if(latestAnnotation) {
					//we have previously found a matching
					
					if(latestAnnotation.postTime < tempAnnotation.postTime || (tempAnnotation.postTime == null && tempAnnotation.type == "autoGraded")) {
						/*
						 * the post time of the previously matching is older than the
						 * new match, or this tempAnnotation is an autoGraded annotation and has not been saved to server yet.
						 * We have just found so we will set it as the latest annotation
						 */
						latestAnnotation = tempAnnotation;
					}
				} else {
					//we have not previously found a matching
					latestAnnotation = tempAnnotation;
				}				
			}
		}
	}
	
	return latestAnnotation;
};


/**
 * Check if any of the objects in the value array have a non-null value
 * for the field
 * @param annotation the annotation object
 * @param field the field we are looking for
 * @return whether any of the objects in the value array have a non-null
 * value for the field
 */
Annotations.prototype.annotationContainsField = function(annotation, field) {
	var result = false;
	
	if(annotation != null) {
		//get the value of the annotation
		var value = annotation.value;
		
		//check if the value is an array
		if(Array.isArray(value)) {
			//loop through all the objects in the array
			for(var x=0; x<value.length; x++) {
				//get an object in the array
				var tempValue = value[x];
				
				//check if the object contains a non-null value for the field we are looking for
				if(tempValue[field] != null) {
					//the object contains a non-null value for the field
					result = true;
					break;
				}
			}
		}
	}
	
	return result;
};

/**
 * Retrieves all the annotations for the given fromWorkgroup (workgroup giving the comment/grade)
 * @param fromWorkgroup the workgroup giving the comment/grade
 * @return an array of annotations written by the fromWorkgroup
 */
Annotations.prototype.getAnnotationsByFromWorkgroup = function(fromWorkgroup) {
	var annotations = new Array();
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.fromWorkgroup == fromWorkgroup) {
			annotations.push(annotation);
		}
	}
	
	return annotations;
};

/**
 * Retrieves all the annotations with the given type 
 * @param type the type of annotation e.g. comment, grade, etc.
 * @return an array containing all the annotations with the given type
 */
Annotations.prototype.getAnnotationsByType = function(type) {
	var annotations = new Array();
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.type == type) {
			annotations.push(annotation);
		}
	}
	
	return annotations;
};

/**
 * Retrieves all the annotations with the given toWorkgroup and type 
 * @param toWorkgroup the to workgroup
 * @param type the type of annotation e.g. comment, grade, etc.
 * @return an array containing all the annotations with the given toWorkgroup and type
 */
Annotations.prototype.getAnnotationsByToWorkgroupType = function(toWorkgroup, type) {
	var annotations = new Array();
	
	for(var x=0; x<this.annotationsArray.length; x++) {
		var annotation = this.annotationsArray[x];
		
		if(annotation.toWorkgroup == toWorkgroup && annotation.type == type) {
			annotations.push(annotation);
		}
	}
	
	return annotations;
};

/**
 * Get an annotation with the given parameters
 * @param runId
 * @param nodeId
 * @param toWorkgroup
 * @param fromWorkgroup
 * @param type
 * @return the annotation with the matching parameters or null
 * if not found
 */
Annotations.prototype.getLatestAnnotationByAll = function(runId, nodeId, toWorkgroup, fromWorkgroup, type) {
	var annotation = null;
	
	/*
	 * loop through the annotations array backwards so we look
	 * at the most recent annotations first
	 */
	for(var x=this.annotationsArray.length - 1; x>=0; x--) {
		//get an annotation
		annotation = this.annotationsArray[x];
		
		//check if the parameters match
		if(annotation.runId == runId &&
				annotation.nodeId == nodeId &&
				annotation.toWorkgroup == toWorkgroup &&
				annotation.fromWorkgroup == fromWorkgroup &&
				annotation.type == type) {
			//they match so we will return the annotation
			return annotation;
		}
	}
	
	//we did not find any matches
	return null;
};

/**
 * Returns the latest annotation with the matching stepWorkId and type.
 * @param stepWorkId the id of the stepWork
 * @param type the type of annotation (score, comment, flag)
 * @return the latest annotation with the matching values or null if not found
 */
Annotations.prototype.getAnnotationByStepWorkIdType = function(stepWorkId, type) {
	var annotation = null;
	
	/*
	 * loop through the annotations array backwards so we look
	 * at the most recent annotations first
	 */
	for(var x=this.annotationsArray.length - 1; x>=0; x--) {
		//get an annotation
		annotation = this.annotationsArray[x];
		
		//check if the parameters match
		if(annotation.stepWorkId == stepWorkId &&
				annotation.type == type) {
			//they match so we will return the annotation
			return annotation;
		}
	}
	
	//we did not find the annotation
	return null;
};

/**
 * Returns the latest annotation with the matching stepWorkId and type and has an object
 * in its value array that contains a non-null value for the given field.
 * @param stepWorkId the id of the stepWork
 * @param type the type of annotation (score, comment, flag)
 * @param field we will require the annotation to have an object in its value array
 * that has the given field
 * e.g. 'autoScore' or 'autoFeedback'
 * @return the latest annotation with the matching values or null if not found
 */
Annotations.prototype.getAnnotationByStepWorkIdTypeField = function(stepWorkId, type, field) {
	var annotation = null;
	
	/*
	 * loop through the annotations array backwards so we look
	 * at the most recent annotations first
	 */
	for(var x=this.annotationsArray.length - 1; x>=0; x--) {
		//get an annotation
		annotation = this.annotationsArray[x];
		
		if(annotation != null) {
			//check if the parameters match
			if(annotation.stepWorkId == stepWorkId &&
					annotation.type == type &&
					this.annotationContainsField(annotation, field)) {
				//they match so we will return the annotation
				return annotation;
			}			
		}
	}
	
	//we did not find an annotation that matches
	return null;
};

/**
 * Get the annotation value for a given step work id, node state id and annotation
 * type
 * 
 * The value field of an annotation will be an array that looks something
 * like this
 * "value": [
 *    {
 *       "maxAutoScore": 4,
 *       "concepts": "",
 *       "autoScore": 0,
 *       "nodeStateId": 1412029344000,
 *       "autoFeedback": "bad 0"
 *    },
 *    {
 *       "maxAutoScore": 4,
 *       "concepts": "1,2,3,4",
 *       "autoScore": 4,
 *       "nodeStateId": 1412029354000,
 *       "autoFeedback": "good 4"
 *    }
 * ]
 * but we will actually only return one of the objects in the array like this
 *    {
 *       "maxAutoScore": 4,
 *       "concepts": "",
 *       "autoScore": 0,
 *       "nodeStateId": 1412029344000,
 *       "autoFeedback": "bad 0"
 *    }
 * The usage of the field name "value" is confusing due to the fact that we originally
 * only set the value field to a number or string but later had to expand it to allow
 * arrays in order to save multiple annotations for a single node visit.
 * 
 * @param stepWorkId the step work id
 * @param nodeStateId the node state id (aka the node state timestamp)
 * @param type the annotation type
 * @return the annotation value or null if not found
 */
Annotations.prototype.getAnnotationValueByStepWorkIdNodeStateIdType = function(stepWorkId, nodeStateId, type) {
	var annotation = null;
	
	/*
	 * loop through the annotations array backwards so we look
	 * at the most recent annotations first
	 */
	for(var x=this.annotationsArray.length - 1; x>=0; x--) {
		//get an annotation
		annotation = this.annotationsArray[x];
		
		//check if the parameters match
		if(annotation.stepWorkId == stepWorkId && annotation.type == type) {
			/*
			 * we have found an annotation with the step work id and annotation 
			 * type that matches what we want
			 */
			
			//get the annotation value
			var annotationValue = annotation.value;
			
			//make sure the annotation value is an array
			if(annotationValue != null && Array.isArray(annotationValue)) {
				/*
				 * loop through all the objects in the array backwards
				 * so we look at the most recent objects first
				 */
				for(var y=annotationValue.length - 1; y>=0; y--) {
					//get an object
					var value = annotationValue[y];
					
					if(value != null) {
						//get the node state id from the object
						var tempNodeStateId = value.nodeStateId;
						
						//check if the node state id matches what we want
						if(nodeStateId == tempNodeStateId) {
							/*
							 * the node state id matches so we have found the 
							 * object we want and will return the object
							 */
							return value;
						}
					}
				}
			}
		}
	}
	
	//we did not find the annotation
	return null;
};

/**
 * Determine if there are any annotations after the given date.
 * This does not include flag annotations. All other types
 * of annotations are checked.
 * @param date the date in milliseconds
 * @return true if there are annotations after the date
 * false if there are no annotations after the date
 */
Annotations.prototype.annotationsAfterDate = function(date) {
	/*
	 * loop through the annotations backwards for efficiency purposes
	 * the annotations are most likely ordered from oldest to newest
	 * and the newest annotations are more likely to be after the
	 * given date
	 */
	for(var x=this.annotationsArray.length - 1; x>=0; x--) {
		//get an annotation
		var annotation = this.annotationsArray[x];
		
		//make sure the annotation is not a flag or inappropriate flag annotation
		if(annotation != null && annotation.type != 'flag' && annotation.type != 'inappropriateFlag') {
			if(annotation.postTime > date) {
				/*
				 * the annotation post time is after the date so we
				 * have found an annotation and will return true
				 */
				return true;
			}			
		}
	}
	
	//we did not find any annotations after the date so we will return false
	return false;
};

/**
 * Get all the node ids that have an annotation associated with them
 * @return an array of node ids that have an annotation associated with them
 */
Annotations.prototype.getNodeIds = function() {
	var nodeIds = [];
	
	//loop through all the annotations
	for(var x=0; x<this.annotationsArray.length; x++) {
		//get an annotation
		var annotation = this.annotationsArray[x];
		
		if(annotation != null) {
			//get the node id for the annotation
			var nodeId = annotation.nodeId;
			
			//add it to the array if it is not already in the array
			if(nodeIds.indexOf(nodeId) == -1) {
				nodeIds.push(nodeId);
			}
		}
	}
	
	return nodeIds;
};

/**
 * Get the latest object in the annotation value array that contains a specific field
 * 
 * The value field of the annotation should be an array that looks something
 * like this
 * "value": [
 *    {
 *       "maxAutoScore": 4,
 *       "concepts": "",
 *       "autoScore": 0,
 *       "nodeStateId": 1412029344000,
 *       "autoFeedback": "bad 0"
 *    },
 *    {
 *       "maxAutoScore": 4,
 *       "concepts": "1,2,3,4",
 *       "autoScore": 4,
 *       "nodeStateId": 1412029354000,
 *       "autoFeedback": "good 4"
 *    }
 * ]
 * we will return the latest object in the array that contains the field we want like this
 *    {
 *       "maxAutoScore": 4,
 *       "concepts": "1,2,3,4",
 *       "autoScore": 4,
 *       "nodeStateId": 1412029354000,
 *       "autoFeedback": "good 4"
 *    }
 * 
 * @param annotation the annotation
 * @param field a field in the annotation value object
 * @return the latest object in the annotation value array that has the field
 */
Annotations.prototype.getLatestAnnotationValueFromValueArray = function(annotation, field) {
    var result = null;
    
    if(annotation != null && field != null) {
        //get the value
        var value = annotation.value;
        
        if(value != null) {
            //check that the value is an array
            if(Array.isArray(value)) {
                //loop through the values from newest to oldest
                for(var x=value.length - 1; x>=0; x--) {
                    //get a value object
                    var tempValue = value[x];
                    
                    if(tempValue != null) {
                        //check if the value object contains a non-null value for the field
                        if(tempValue[field] != null) {
                            /*
                             * we have found a value object that has a non-null value for 
                             * the field so we will return that value object
                             */
                            result = tempValue;
                            break;
                        }
                    }
                }
            }       
        }
    }
    
    return result;
};

/**
 * Get the max auto score for a node id by looking at the annotations
 * @param nodeId the node id
 * @return the max auto score or null
 */
Annotations.prototype.getMaxAutoScoreForNodeId = function(nodeId) {
    
    if (this.annotationsArray != null) {
        
        // loop through all the annotations
        for (var a = this.annotationsArray.length - 1; a >= 0; a--) {
            var annotation = this.annotationsArray[a];
            
            if (annotation != null) {
                var annotationNodeId = annotation.nodeId;
                var annotationType = annotation.type;
                
                if (nodeId === annotationNodeId && annotationType === 'autoGraded') {
                    // the node id matches the one we are looking for
                    
                    var value = annotation.value;
                    
                    if (value != null) {
                        
                        // loop through all the values
                        for (var v = value.length - 1; v >= 0; v--) {
                            var tempValue = value[v];
                            
                            if (tempValue != null) {
                                if (tempValue.maxAutoScore != null) {
                                    // return the max auto score
                                    return tempValue.maxAutoScore;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return null;
};

//used to notify scriptloader that this script has finished loading
if(typeof eventManager != 'undefined'){
	eventManager.fire('scriptLoaded', 'vle/model/Annotation.js');
};