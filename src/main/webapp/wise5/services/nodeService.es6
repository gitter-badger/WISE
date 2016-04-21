class NodeService {

    constructor($http, $injector, $q, ConfigService, ProjectService, StudentDataService) {
        this.$http = $http;
        this.$injector = $injector;
        this.$q = $q;
        this.ConfigService = ConfigService;
        this.ProjectService = ProjectService;
        this.StudentDataService = StudentDataService;
    }

    /**
     * Create a new empty node state
     * @return a new empty node state
     */
    createNewComponentState() {
        var componentState = {};

        // set the timestamp
        componentState.clientSaveTime = Date.parse(new Date());

        return componentState;
    };

    /**
     * Create a new empty node state
     * @return a new empty node state
     */
    createNewNodeState() {
        var nodeState = {};
        nodeState.runId = this.ConfigService.getRunId();
        nodeState.periodId = this.ConfigService.getPeriodId();
        nodeState.workgroupId = this.ConfigService.getWorkgroupId();

        // set the timestamp
        nodeState.clientSaveTime = Date.parse(new Date());

        return nodeState;
    };

    /**
     * Get the node type in camel case
     * @param nodeType the node type e.g. OpenResponse
     * @return the node type in camel case
     * e.g.
     * openResponse
     */
    toCamelCase(nodeType) {
        var nodeTypeCamelCased = null;

        if (nodeType != null && nodeType.length > 0) {

            // get the first character
            var firstChar = nodeType.charAt(0);

            if(firstChar != null) {

                // make the first character lower case
                var firstCharLowerCase = firstChar.toLowerCase();

                if (firstCharLowerCase != null) {

                    /*
                     * replace the first character with the lower case
                     * character
                     */
                    nodeTypeCamelCased = firstCharLowerCase + nodeType.substr(1);
                }
            }
        }

        return nodeTypeCamelCased;
    };

    /**
     * Check if the string is in all uppercase
     * @param str the string to check
     * @return whether the string is in all uppercase
     */
    isStringUpperCase(str) {
        var result = false;

        if (str != null) {
            if (str === str.toUpperCase()) {
                // the string is in all uppercase
                result = true;
            }
        }

        return result;
    };

    /**
     * Get the html template for the component
     * @param componentType the component type
     * @return the path to the html template for the component
     */
    getComponentTemplatePath(componentType) {

        if (componentType == null) {
            // error
        } else if (this.isStringUpperCase(componentType)) {
            /*
             * the component type is all uppercase so we will convert it to all
             * lowercase
             */
            componentType = componentType.toLowerCase();
        } else {
            // get the component type in camel case
            componentType = this.toCamelCase(componentType);
        }
        var wiseBaseURL = this.ConfigService.getWISEBaseURL();
        return wiseBaseURL + '/wise5/components/' + componentType + '/index.html';
    };

    /**
     * Get the component content
     * @param componentContent the component content
     * @param componentId the component id
     * @return the component content
     */
    getComponentContentById(nodeContent, componentId) {
        var componentContent = null;

        if (nodeContent != null && componentId != null) {

            // get the components
            var components = nodeContent.components;

            if (components != null) {

                // loop through the components
                for (var c = 0; c < components.length; c++) {
                    var tempComponent = components[c];

                    if (tempComponent != null) {
                        var tempComponentId = tempComponent.id;

                        if (tempComponentId === componentId) {
                            // we have found the component with the component id we want
                            componentContent = tempComponent;
                            break;
                        }
                    }
                }
            }
        }

        return componentContent;
    };

    /**
     * Check if any of the component states were submitted
     * @param componentStates an array of component states
     * @return whether any of the component states were submitted
     */
    isWorkSubmitted(componentStates) {
        var result = false;

        if (componentStates != null) {

            // loop through all the component states
            for (var c = 0; c < componentStates.length; c++) {
                var componentState = componentStates[c];

                if (componentState != null) {

                    if (componentState.isSubmit) {
                        result = true;
                        break;
                    }
                }
            }
        }

        return result;
    };

    /**
     * Check if the node or component is completed
     * @param functionParams the params that will specify which node or component
     * to check for completion
     * @returns whether the specified node or component is completed
     */
    isCompleted(functionParams) {

        var result = false;

        if (functionParams != null) {
            var nodeId = functionParams.nodeId;
            var componentId = functionParams.componentId;

            result = this.StudentDataService.isCompleted(nodeId, componentId);
        }

        return result;
    };

    /**
     * Go to the next node
     */
    goToNextNode() {

        var nextNodeId = this.getNextNodeId();
        if (nextNodeId != null) {
            this.StudentDataService.endCurrentNodeAndSetCurrentNodeByNodeId(nextNodeId);
        }
    };

    /**
     * Get the next node in the project sequence
     */
    getNextNodeId() {

        var nextNodeId = null;

        // get the current node
        var currentNode = this.StudentDataService.getCurrentNode();

        if (currentNode != null) {
            var currentNodeId = currentNode.id;

            // get all the branchPathTaken events for the current node
            var branchPathTakenEvents = this.StudentDataService.getBranchPathTakenEventsByNodeId(currentNodeId);
            
            if (branchPathTakenEvents != null && branchPathTakenEvents.length > 0) {
                // the student has branched on this node before
                
                // loop through all the branchPathTaken events from newest to oldest
                for (var b = branchPathTakenEvents.length - 1; b >= 0; b--) {
                    var branchPathTakenEvent = branchPathTakenEvents[b];
                    
                    if (branchPathTakenEvent != null) {
                        
                        // get the data from the event
                        var data = branchPathTakenEvent.data;
                        
                        if (data != null) {
                            // get the to node id
                            var toNodeId = data.toNodeId;
                            nextNodeId = toNodeId;
                            break;
                        }
                    }
                }
            } else {
                // the student has not branched on this node before
                
                // get the transition logic from the current node
                var transitions = this.ProjectService.getTransitionLogicByFromNodeId(currentNodeId);

                // choose a transition
                var transition = this.chooseTransition(transitions);

                if (transition != null) {
                    // move the student to the toNodeId
                    nextNodeId = transition.to;
                }
            }
        }

        return nextNodeId;
    };

    /**
     * Go to the previous node
     */
    goToPrevNode() {

        var prevNodeId = this.getPrevNodeId();
        if (prevNodeId != null) {
            this.StudentDataService.endCurrentNodeAndSetCurrentNodeByNodeId(prevNodeId);
        }
    };

    /**
     * Get the previous node in the project sequence
     */
    getPrevNodeId() {

        var prevNodeId = null;

        // get the current node
        var currentNode = this.StudentDataService.getCurrentNode();

        if (currentNode != null) {

            var currentNodeId = currentNode.id;
            
            // get all the nodes that transition to the current node
            var nodeIdsByToNodeId = this.ProjectService.getNodeIdsByToNodeId(currentNodeId);
            
            if (nodeIdsByToNodeId == null) {
                
            } else if (nodeIdsByToNodeId.length === 1) {
                // there is only one node that transitions to the current node
                prevNodeId = nodeIdsByToNodeId[0];
            } else if (nodeIdsByToNodeId.length > 1) {
                // there are multiple nodes that transition to the current node
                
                // get the visited nodes history
                var visitedNodesHistory = this.StudentDataService.getVisitedNodesHistory();
                
                // loop through the visited node ids from newest to oldest
                for (var v = visitedNodesHistory.length - 1; v >= 0; v--) {
                    var visitedNodesHistoryNodeId = visitedNodesHistory[v];
                    
                    if (nodeIdsByToNodeId.indexOf(visitedNodesHistoryNodeId) != -1) {
                        // we have found a node that we previously visited that transitions to the current node
                        prevNodeId = visitedNodesHistoryNodeId;
                        break;
                    }
                }
            }
        }

        return prevNodeId;
    };

    /**
     * Close the current node (and open the current node's parent group)
     */
    closeNode() {
        var currentNode = this.StudentDataService.getCurrentNode();
        if (currentNode) {

            var currentNodeId = currentNode.id;

            // get the parent node of the current node
            var parentNode = this.ProjectService.getParentGroup(currentNodeId);

            var parentNodeId = parentNode.id;

            // set the current node to the parent node
            this.StudentDataService.endCurrentNodeAndSetCurrentNodeByNodeId(parentNodeId);
        }
    };

    /**
     * Choose the transition the student will take
     * @param transitionLogic an object containing transitions and parameters
     * for how to choose a transition
     * @returns a transition object
     */
    chooseTransition(transitionLogic) {
        var transitionResult = null;
        if (transitionLogic != null) {

            // get the transitions
            var transitions = transitionLogic.transitions;

            if (transitions != null) {

                var availableTransitions = [];

                // loop through all the transitions
                for (var t = 0; t < transitions.length; t++) {

                    // get a transition
                    var transition = transitions[t];

                    // get the to node id
                    var toNodeId = transition.to;

                    // get the criteria for which this transition can be used
                    var criteria = transition.criteria;

                    // set the default result to true in case there is no criteria
                    var criteriaResult = true;

                    if (criteria != null) {

                        var firstResult = true;
                        var tempResult = true;

                        // loop through all of the criteria
                        for (var c = 0; c < criteria.length; c++) {

                            // get a criteria
                            var tempCriteria = criteria[c];

                            // check if the criteria is satisfied
                            tempResult = this.StudentDataService.evaluateCriteria(tempCriteria);

                            if (firstResult) {
                                // this is the first criteria in this for loop
                                criteriaResult = tempResult;
                                firstResult = false;
                            } else {
                                // this is not the first criteria in this for loop so we will && the result
                                criteriaResult = criteriaResult && tempResult;
                            }
                        }
                    }

                    if (toNodeId != null) {

                        // check if the criteria was satisfied and the to node is visitable
                        if (criteriaResult) {

                            // the student is allowed to use the transition
                            availableTransitions.push(transition);
                        }
                    }
                }

                // there are available transitions for the student
                if (availableTransitions.length > 0) {

                    var howToChooseAmongAvailablePaths = transitionLogic.howToChooseAmongAvailablePaths;

                    if (howToChooseAmongAvailablePaths == null || 
                        howToChooseAmongAvailablePaths === '' || 
                        howToChooseAmongAvailablePaths === 'random') {
                        // choose a random transition

                        var randomIndex = Math.floor(Math.random() * availableTransitions.length);
                        transitionResult = availableTransitions[randomIndex];
                    } else if (howToChooseAmongAvailablePaths === 'workgroupId') {
                        // use the workgroup id to choose the transition
                        
                        // get the workgroup id
                        var workgroupId = this.ConfigService.getWorkgroupId();
                        
                        // choose the transition index
                        var index = workgroupId % availableTransitions.length;
                        
                        transitionResult = availableTransitions[index];
                    } else if (howToChooseAmongAvailablePaths === 'firstAvailable') {
                        // choose the first available transition

                        transitionResult = availableTransitions[0];
                    } else if (howToChooseAmongAvailablePaths === 'lastAvailable') {
                        // choose the last available transition

                        transitionResult = availableTransitions[availableTransitions.length - 1];
                    }
                }
            }
        }
        return transitionResult;
    };

    hasTransitionLogic() {
        var result = false;

        var currentNode = this.StudentDataService.getCurrentNode();

        if (currentNode != null) {
            var transitionLogic = currentNode.transitionLogic;

            if (transitionLogic != null) {
                result = true;
            }
        }

        return result;
    };

    evaluateTransitionLogic() {
        // get the current node
        var currentNode = this.StudentDataService.getCurrentNode();

        if (currentNode != null) {

            var transitionLogic = currentNode.transitionLogic;

            if (transitionLogic != null) {

                // get all the transitions from the current node
                var transitions = transitionLogic.transitions;
                var canChangePath = transitionLogic.canChangePath;
                var alreadyBranched = false;
                
                // get all the branchPathTaken events for the current node
                var events = this.StudentDataService.getBranchPathTakenEventsByNodeId(currentNode.id);

                if (events.length > 0) {
                    // the student has branched from this node before
                    alreadyBranched = true;
                }

                var transition, fromNodeId, toNodeId;

                if (alreadyBranched) {
                    // student has previously branched

                    if (canChangePath) {
                        // student can change path

                        // choose a transition
                        transition = this.chooseTransition(transitionLogic);

                        if (transition != null) {
                            fromNodeId = currentNode.id;
                            toNodeId = transition.to;

                            // create a branchPathTaken event to signify taking the branch path
                            this.createBranchPathTakenEvent(fromNodeId, toNodeId);
                        }
                    } else {
                        // student can't change path

                    }

                } else {
                    // student has not branched yet

                    // choose a transition
                    transition = this.chooseTransition(transitionLogic);

                    if (transition != null) {
                        fromNodeId = currentNode.id;
                        toNodeId = transition.to;

                        // create a branchPathTaken event to signify taking the branch path
                        this.createBranchPathTakenEvent(fromNodeId, toNodeId);
                    }
                }
            }
        }
    };
    
    /**
     * Create a branchPathTaken event
     * @param fromNodeId the from node id
     * @param toNodeid the to node id
     */
    createBranchPathTakenEvent(fromNodeId, toNodeId) {
        var nodeId = fromNodeId;
        var componentId = null;
        var componentType = null;
        var category = "Navigation";
        var event = "branchPathTaken";
        var eventData = {};
        eventData.fromNodeId = fromNodeId;
        eventData.toNodeId = toNodeId;
        this.StudentDataService.saveVLEEvent(nodeId, componentId, componentType, category, event, eventData);
    }

    evaluateTransitionLogicOn(event) {
        var result = false;

        // get the current node
        var currentNode = this.StudentDataService.getCurrentNode();

        if (currentNode != null) {
            var transitionLogic = currentNode.transitionLogic;

            var whenToChoosePath = transitionLogic.whenToChoosePath;

            if (event === whenToChoosePath) {
                result = true;
            }
        }

        return result;
    };

}

NodeService.$inject = ['$http', '$injector', '$q', 'ConfigService', 'ProjectService', 'StudentDataService'];

export default NodeService;
