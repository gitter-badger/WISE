'use strict';

class AudioOscillatorController {

    constructor($injector,
                $rootScope,
                $scope,
                $timeout,
                NodeService,
                AudioOscillatorService,
                ProjectService,
                StudentAssetService,
                StudentDataService) {

        this.$injector = $injector;
        this.$rootScope = $rootScope;
        this.$scope = $scope;
        this.$timeout = $timeout;
        this.NodeService = NodeService;
        this.AudioOscillatorService = AudioOscillatorService;
        this.ProjectService = ProjectService;
        this.StudentAssetService = StudentAssetService;
        this.StudentDataService = StudentDataService;

        // the node id of the current node
        this.nodeId = null;

        // the component id
        this.componentId = null;

        // field that will hold the component content
        this.componentContent = null;

        // field that will hold the authoring component content
        this.authoringComponentContent = null;

        // holds the text that the student has typed
        this.studentResponse = '';

        // holds student attachments like assets
        this.attachments = [];

        // whether the step should be disabled
        this.isDisabled = false;

        // whether the student work is dirty and needs saving
        this.isDirty = false;

        // whether the student work has changed since last submit
        this.isSubmitDirty = false;

        // message to show next to save/submit buttons
        this.saveMessage = {
            text: '',
            time: ''
        };

        // whether this component is showing previous work
        this.isShowPreviousWork = false;

        // whether the student work is for a submit
        this.isSubmit = false;

        // whether students can attach files to their work
        this.isStudentAttachmentEnabled = false;

        // whether the prompt is shown or not
        this.isPromptVisible = true;

        // whether the save button is shown or not
        this.isSaveButtonVisible = false;

        // whether the submit button is shown or not
        this.isSubmitButtonVisible = false;
        
        // whether the audio is playing
        this.isPlaying = false;
        
        // default oscillator type to sine
        this.oscillatorType = "sine";
        
        // default frequency is 440
        this.frequency = 440;
        
        // holds the oscillator types the student can choose
        this.oscillatorTypes = [];
        
        // the default dimensions of the oscilloscope
        this.oscilloscopeId = 'oscilloscope';
        this.oscilloscopeWidth = 800;
        this.oscilloscopeHeight = 400;
        this.gridCellSize = 50;
        
        // create the audio context
        this.audioContext = new AudioContext();
        
        // whether we should stop drawing after a good draw
        this.stopAfterGoodDraw = true;
        
        this.showOscillatorTypeChooser = false;
        this.availableOscillatorTypes = [
            'sine',
            'square',
            'triangle',
            'sawtooth'
        ]
        this.oscillatorTypeToAdd = 'sine';

        // get the current node and node id
        var currentNode = this.StudentDataService.getCurrentNode();
        if (currentNode != null) {
            this.nodeId = currentNode.id;
        } else {
            this.nodeId = this.$scope.nodeId;
        }

        // get the component content from the scope
        this.componentContent = this.$scope.componentContent;

        // get the authoring component content
        this.authoringComponentContent = this.$scope.authoringComponentContent;

        this.mode = this.$scope.mode;

        if (this.componentContent != null) {

            // get the component id
            this.componentId = this.componentContent.id;

            if (this.mode === 'student') {
                this.isPromptVisible = true;
                this.isSaveButtonVisible = this.componentContent.showSaveButton;
                this.isSubmitButtonVisible = this.componentContent.showSubmitButton;
            } else if (this.mode === 'grading') {
                this.isPromptVisible = true;
                this.isSaveButtonVisible = false;
                this.isSubmitButtonVisible = false;
                this.isDisabled = true;
            } else if (this.mode === 'onlyShowWork') {
                this.isPromptVisible = false;
                this.isSaveButtonVisible = false;
                this.isSubmitButtonVisible = false;
                this.isDisabled = true;
            } else if (this.mode === 'authoring') {
                this.updateAdvancedAuthoringView();

                $scope.$watch(function() {
                    return this.authoringComponentContent;
                }.bind(this), function(newValue, oldValue) {
                    this.componentContent = this.ProjectService.injectAssetPaths(newValue);
                    this.oscillatorTypes = this.componentContent.oscillatorTypes;
                    this.frequency = this.componentContent.startingFrequency;
                    this.oscilloscopeWidth = this.componentContent.oscilloscopeWidth;
                    this.oscilloscopeHeight = this.componentContent.oscilloscopeHeight;
                    this.gridCellSize = this.componentContent.gridCellSize;
                    this.stopAfterGoodDraw = this.componentContent.stopAfterGoodDraw;
                    $timeout(() => {this.drawOscilloscopeGrid()}, 0);
                }.bind(this), true);
            }
            
            this.oscilloscopeId = 'oscilloscope' + this.componentId;
            
            if (this.componentContent.startingFrequency != null) {
                this.frequency = this.componentContent.startingFrequency;
            }
            
            if (this.componentContent.oscillatorTypes != null) {
                this.oscillatorTypes = this.componentContent.oscillatorTypes;
                
                if (this.componentContent.oscillatorTypes.length > 0) {
                    this.oscillatorType = this.componentContent.oscillatorTypes[0];
                }
            }
            
            if (this.componentContent.oscilloscopeWidth != null) {
                this.oscilloscopeWidth = this.componentContent.oscilloscopeWidth;
            }
            
            if (this.componentContent.oscilloscopeHeight != null) {
                this.oscilloscopeHeight = this.componentContent.oscilloscopeHeight;
            }
            
            if (this.componentContent.gridCellSize != null) {
                this.gridCellSize = this.componentContent.gridCellSize;
            }
            
            if (this.componentContent.stopAfterGoodDraw != null) {
                this.stopAfterGoodDraw = this.componentContent.stopAfterGoodDraw;
            }

            // get the show previous work node id if it is provided
            var showPreviousWorkNodeId = this.componentContent.showPreviousWorkNodeId;

            var componentState = null;

            // set whether studentAttachment is enabled
            this.isStudentAttachmentEnabled = this.componentContent.isStudentAttachmentEnabled;

            // get the component state from the scope
            componentState = this.$scope.componentState;

            if (componentState == null) {
                /*
                 * only import work if the student does not already have
                 * work for this component
                 */

                // check if we need to import work
                var importWorkNodeId = this.componentContent.importWorkNodeId;
                var importWorkComponentId = this.componentContent.importWorkComponentId;

                if (importWorkNodeId != null && importWorkComponentId != null) {
                    // import the work from the other component
                    this.importWork();
                } else if (this.componentContent.starterSentence != null) {
                    /*
                     * the student has not done any work and there is a starter sentence
                     * so we will populate the textarea with the starter sentence
                     */
                    this.studentResponse = this.componentContent.starterSentence;
                }
            } else {
                // populate the student work into this component
                this.setStudentWork(componentState);
            }

            // check if we need to lock this component
            this.calculateDisabled();

            if (this.$scope.$parent.registerComponentController != null) {
                // register this component with the parent node
                this.$scope.$parent.registerComponentController(this.$scope, this.componentContent);
            }
            
            /*
             * draw the oscilloscope grid after angular has finished rendering
             * the view. we need to wait until after angular has set the
             * canvas width and height to draw the grid because setting the
             * dimensions of the canvas will erase it.
             */
            $timeout(() => {this.drawOscilloscopeGrid()}, 0);
        }

        /**
         * Returns true iff there is student work that hasn't been saved yet
         */
        this.$scope.isDirty = function() {
            return this.$scope.audioOscillatorController.isDirty;
        }.bind(this);

        /**
         * Get the component state from this component. The parent node will
         * call this function to obtain the component state when it needs to
         * save student data.
         * @param isSubmit boolean whether the request is coming from a submit
         * action (optional; default is false)
         * @return a component state containing the student data
         */
        this.$scope.getComponentState = function(isSubmit) {
            let componentState = null;
            let getState = false;

            if (isSubmit) {
                if (this.$scope.audioOscillatorController.isSubmitDirty) {
                    getState = true;
                }
            } else {
                if (this.$scope.audioOscillatorController.isDirty) {
                    getState = true;
                }
            }

            if (getState) {
                // create a component state populated with the student data
                componentState = this.$scope.audioOscillatorController.createComponentState();
            }

            return componentState;
        }.bind(this);

        /**
         * The parent node submit button was clicked
         */
        this.$scope.$on('nodeSubmitClicked', function(event, args) {

            // get the node id of the node
            var nodeId = args.nodeId;

            // make sure the node id matches our parent node
            if (this.nodeId === nodeId) {
                this.isSubmit = true;
            }
        }.bind(this));

        /**
         * Listen for the 'studentWorkSavedToServer' event which is fired when
         * we receive the response from saving a component state to the server
         */
        this.$scope.$on('studentWorkSavedToServer', angular.bind(this, function(event, args) {

            let componentState = args.studentWork;

            // check that the component state is for this component
            if (componentState && this.nodeId === componentState.nodeId
                && this.componentId === componentState.componentId) {

                // set isDirty to false because the component state was just saved and notify node
                this.isDirty = false;
                this.$scope.$emit('componentDirty', {componentId: this.componentId, isDirty: false});

                let isAutoSave = componentState.isAutoSave;
                let isSubmit = componentState.isSubmit;
                let clientSaveTime = componentState.clientSaveTime;

                // set save message
                if (isSubmit) {
                    this.setSaveMessage('Submitted', clientSaveTime);

                    this.submit();

                    // set isSubmitDirty to false because the component state was just submitted and notify node
                    this.isSubmitDirty = false;
                    this.$scope.$emit('componentSubmitDirty', {componentId: this.componentId, isDirty: false});
                } else if (isAutoSave) {
                    this.setSaveMessage('Auto-saved', clientSaveTime);
                } else {
                    this.setSaveMessage('Saved', clientSaveTime);
                }
            }
        }));

        /**
         * Listen for the 'exitNode' event which is fired when the student
         * exits the parent node. This will perform any necessary cleanup
         * when the student exits the parent node.
         */
        this.$scope.$on('exitNode', function(event, args) {

        }.bind(this));
    }

    /**
     * Populate the student work into the component
     * @param componentState the component state to populate into the component
     */
    setStudentWork(componentState) {

        if (componentState != null) {
            var studentData = componentState.studentData;

            if (studentData != null) {
                var response = studentData.response;

                if (response != null) {
                    // populate the text the student previously typed
                    this.studentResponse = response;
                }

                var attachments = studentData.attachments;

                if (attachments != null) {
                    this.attachments = attachments;
                }

                this.processLatestSubmit();
            }
        }
    };

    /**
     * Check if latest component state is a submission and set isSubmitDirty accordingly
     */
    processLatestSubmit() {
        let latestState = this.StudentDataService.getLatestComponentStateByNodeIdAndComponentId(this.nodeId, this.componentId);

        if (latestState) {
            if (latestState.isSubmit) {
                // latest state is a submission, so set isSubmitDirty to false and notify node
                this.isSubmitDirty = false;
                this.$scope.$emit('componentSubmitDirty', {componentId: this.componentId, isDirty: false});
                // set save message
                this.setSaveMessage('Last submitted', latestState.clientSaveTime);
            } else {
                // latest state is not a submission, so set isSubmitDirty to true and notify node
                this.isSubmitDirty = true;
                this.$scope.$emit('componentSubmitDirty', {componentId: this.componentId, isDirty: true});
                // set save message
                this.setSaveMessage('Last saved', latestState.clientSaveTime);
            }
        }
    };

    /**
     * Called when the student clicks the save button
     */
    saveButtonClicked() {
        this.isSubmit = false;

        // tell the parent node that this component wants to save
        this.$scope.$emit('componentSaveTriggered', {nodeId: this.nodeId, componentId: this.componentId});
    };

    /**
     * Called when the student clicks the submit button
     */
    submitButtonClicked() {
        this.isSubmit = true;

        // tell the parent node that this component wants to submit
        this.$scope.$emit('componentSubmitTriggered', {nodeId: this.nodeId, componentId: this.componentId});
    };

    submit() {
        // check if we need to lock the component after the student submits
        if (this.isLockAfterSubmit()) {
            this.isDisabled = true;
        }
    };

    /**
     * Called when the student changes their work
     */
    studentDataChanged() {
        /*
         * set the dirty flags so we will know we need to save or submit the
         * student work later
         */
        this.isDirty = true;
        this.$scope.$emit('componentDirty', {componentId: this.componentId, isDirty: true});

        this.isSubmitDirty = true;
        this.$scope.$emit('componentSubmitDirty', {componentId: this.componentId, isDirty: true});

        // clear out the save message
        this.setSaveMessage('', null);

        // get this part id
        var componentId = this.getComponentId();

        // create a component state populated with the student data
        var componentState = this.createComponentState();

        /*
         * the student work in this component has changed so we will tell
         * the parent node that the student data will need to be saved.
         * this will also notify connected parts that this component's student
         * data has changed.
         */
        this.$scope.$emit('componentStudentDataChanged', {componentId: componentId, componentState: componentState});
    };

    /**
     * Get the student response
     */
    getStudentResponse() {
        return this.studentResponse;
    };

    /**
     * Create a new component state populated with the student data
     * @return the componentState after it has been populated
     */
    createComponentState() {

        // create a new component state
        var componentState = this.NodeService.createNewComponentState();

        // get the text the student typed
        var response = this.getStudentResponse();

        // set the response into the component state
        var studentData = {};
        studentData.response = response;
        studentData.attachments = angular.copy(this.attachments);  // create a copy without reference to original array

        if (this.isSubmit) {
            // the student submitted this work
            componentState.isSubmit = this.isSubmit;

            /*
             * reset the isSubmit value so that the next component state
             * doesn't maintain the same value
             */
            this.isSubmit = false;
        }

        // set the student data into the component state
        componentState.studentData = studentData;

        return componentState;
    };

    /**
     * Check if we need to lock the component
     */
    calculateDisabled() {

        // get the component content
        var componentContent = this.componentContent;

        if (componentContent != null) {

            // check if the parent has set this component to disabled
            if (componentContent.isDisabled) {
                this.isDisabled = true;
            } else if (componentContent.lockAfterSubmit) {
                // we need to lock the component after the student has submitted

                // get the component states for this component
                var componentStates = this.StudentDataService.getComponentStatesByNodeIdAndComponentId(this.nodeId, this.componentId);

                // check if any of the component states were submitted
                var isSubmitted = this.NodeService.isWorkSubmitted(componentStates);

                if (isSubmitted) {
                    // the student has submitted work for this component
                    this.isDisabled = true;
                }
            }
        }
    };

    /**
     * Check whether we need to show the prompt
     * @return whether to show the prompt
     */
    showPrompt() {
        return this.isPromptVisible;
    };

    /**
     * Check whether we need to show the save button
     * @return whether to show the save button
     */
    showSaveButton() {
        return this.isSaveButtonVisible;
    };

    /**
     * Check whether we need to show the submit button
     * @return whether to show the submit button
     */
    showSubmitButton() {
        return this.isSubmitButtonVisible;
    };

    /**
     * Check whether we need to lock the component after the student
     * submits an answer.
     */
    isLockAfterSubmit() {
        var result = false;

        if (this.componentContent != null) {

            // check the lockAfterSubmit field in the component content
            if (this.componentContent.lockAfterSubmit) {
                result = true;
            }
        }

        return result;
    };

    removeAttachment(attachment) {
        if (this.attachments.indexOf(attachment) != -1) {
            this.attachments.splice(this.attachments.indexOf(attachment), 1);
            this.studentDataChanged();
            // YOU ARE NOW FREEEEEEEEE!
        }
    };

    /**
     * Attach student asset to this Component's attachments
     * @param studentAsset
     */
    attachStudentAsset(studentAsset) {
        if (studentAsset != null) {
            this.StudentAssetService.copyAssetForReference(studentAsset).then( (copiedAsset) => {
                if (copiedAsset != null) {
                    var attachment = {
                        studentAssetId: copiedAsset.id,
                        iconURL: copiedAsset.iconURL
                    };

                    this.attachments.push(attachment);
                    this.studentDataChanged();
                }
            });
        }
    };

    /**
     * Get the prompt to show to the student
     */
    getPrompt() {
        var prompt = null;

        if (this.componentContent != null) {
            prompt = this.componentContent.prompt;
        }

        return prompt;
    };

    /**
     * Get the text the student typed
     */
    getResponse() {
        var response = null;

        if (this.studentResponse != null) {
            response = this.studentResponse;
        }

        return response;
    };
    
    /**
     * The play/stop button was clicked
     */
    playStopClicked() {
        
        if (this.isPlaying) {
            // the audio is playing so we will now stop it
            this.stop();
        } else {
            // the audio is not playing so we will not play it
            this.play();
        }
    };
    
    /**
     * Start playing the audio and draw the oscilloscope
     */
    play() {
        
        // create the oscillator
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = this.oscillatorType;
        this.oscillator.frequency.value = this.frequency;
        
        this.gain = this.audioContext.createGain();
        this.gain.gain.value = 0.5;
        this.destination = this.audioContext.destination;
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        
        // connect the audio components together
        this.oscillator.connect(this.gain);
        this.gain.connect(this.destination);
        this.gain.connect(this.analyser);
        
        this.oscillator.start();
        
        /*
         * reset the goodDraw boolean value to false because we need 
         * to find a good draw again
         */
        this.goodDraw = false;
        
        // draw the oscilloscope
        this.drawOscilloscope(this.analyser);
        
        this.isPlaying = true;
    }
    
    /**
     * Stop the audio
     */
    stop() {
        this.oscillator.stop();
        
        this.isPlaying = false;
    }
    
    /**
     * Draw the oscilloscope
     */
    drawOscilloscope() {
        
        // get the analyser to obtain the oscillator data
        var analyser = this.analyser;
        
        // get the oscilloscope canvas context
        var ctx = document.getElementById(this.oscilloscopeId).getContext('2d');
        
        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        
        // get the number of samples, this will be half the fftSize
        var bufferLength = analyser.frequencyBinCount;
        
        // create an array to hold the oscillator data
        var timeData = new Uint8Array(bufferLength);

        // populate the oscillator data into the timeData array
        analyser.getByteTimeDomainData(timeData);
        
        // draw the grid
        this.drawOscilloscopeGrid();

        // start drawing the audio signal line from the oscillator
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 200, 0)'; // green
        ctx.beginPath();

        var sliceWidth = width * 1.0 / bufferLength;
        var x = 0;
        var v = 0;
        var y = 0;
        
        /*
         * we want to start drawing the audio signal such that the first point
         * is at 0,0 on the oscilloscope and the signal rises after that.
         * e.g. pretend the ascii below is a sine wave
         *   _      _
         *  / \    / \
         * -------------------
         *     \_/    \_/
         */
        var foundFirstRisingZeroCrossing = false;
        var firstRisingZeroCrossingIndex = null;
        var firstPointDrawn = false;
        
        /*
         * loop through all the points and draw the signal from the first
         * rising zero crossing to the end of the buffer
         */
        for (var i = 0; i < bufferLength; i++) {
            var currentY = timeData[i] - 128;
            var nextY = timeData[i + 1] - 128;
            
            // check if the current data point is the first rising zero crossing
            if (!foundFirstRisingZeroCrossing && 
                (currentY < 0 || currentY == 0) && nextY > 0) {
                    
                // the point is the first rising zero crossing
                foundFirstRisingZeroCrossing = true;
                firstRisingZeroCrossingIndex = i;
            }
            
            if (foundFirstRisingZeroCrossing) {
                /*
                 * we have found the first rising zero crossing so we can start
                 * drawing the points. 
                 */
                
                /*
                 * get the height of the point. we need to perform this 
                 * subtraction of 128 to flip the value since canvas
                 * positioning is relative to the upper left corner being 0,0.
                 */
                v = (128 - (timeData[i] - 128)) / 128.0;
                y = v * height / 2;
                
                if (firstPointDrawn) {
                    // this is not the first point to be drawn
                    ctx.lineTo(x, y);
                } else {
                    // this is the first point to be drawn
                    ctx.moveTo(x, y);
                    firstPointDrawn = true;
                }
                
                // update the x position we are drawing at
                x += sliceWidth;
            }
        }
        
        if (firstRisingZeroCrossingIndex > 0 && firstRisingZeroCrossingIndex < 10) {
            /*
             * we want the first rising zero crossing index to be close to zero
             * so that the graph spans almost the whole width of the canvas.
             * if first rising zero crossing index was close to bufferLength
             * then we would see a cut off graph.
             */
            this.goodDraw = true;
        }
        
        // draw the lines on the canvas
        ctx.stroke();
        
        if (!this.stopAfterGoodDraw || (this.stopAfterGoodDraw && !this.goodDraw)) {
            /*
             * the draw was not good so we will try to draw it again by
             * sampling the oscillator again and drawing again. if the
             * draw was good we will stop drawing.
             */
            requestAnimationFrame(() => {
                this.drawOscilloscope();
            });
        }
    }
    
    /**
     * Draw the oscilloscope gride
     */
    drawOscilloscopeGrid() {
        // get the oscilliscope canvas context
        var ctx = document.getElementById(this.oscilloscopeId).getContext('2d');
        
        var width = ctx.canvas.width;
        var height = ctx.canvas.height;
        var gridCellSize = this.gridCellSize;
        
        // draw a white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'lightgrey';
        ctx.beginPath();
        
        var x = 0;
        
        // draw the vertical lines
        while (x < width) {
            
            // draw a vertical line
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            
            // move the x position to the right
            x += gridCellSize;
        }
        
        // start by drawing the line in the middle
        var y = height / 2;
        
        // draw the horizontal lines above and including the middle line
        while (y >= 0) {
            
            // draw a horizontal line
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            
            // move the y position up (this is up because of canvas positioning)
            y -= gridCellSize;
        }
        
        y = height / 2;
        
        // draw the horizontal lines below the middle line
        while (y <= height) {
            
            // draw a horizontal line
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            
            // move the y position down (this is down because of canvas positioning)
            y += gridCellSize;
        }
        
        // draw the lines on the canvas
        ctx.stroke();
    }
    
    /**
     * The oscillator type changed
     */
    oscillatorTypeChanged() {
        
        // clear the grid
        this.drawOscilloscopeGrid();
        
        if(this.isPlaying) {
            this.restartPlayer();
        }
    }
    
    /**
     * The frequency changed
     */
    frequencyChanged() {
        
        // clear the grid
        this.drawOscilloscopeGrid();
        
        if(this.isPlaying) {
            this.restartPlayer();
        }
    }
    
    /**
     * Restart the player
     */
    restartPlayer() {
        this.stop();
        this.play();
    }

    /**
     * Show the controls for adding an oscillator type
     */
    authoringOpenAddOscillatorType() {
        this.showOscillatorTypeChooser = true;
    }
    
    /**
     * The author has clicked the add button to add an oscillator type
     */
    authoringAddOscillatorTypeClicked() {
        var oscillatorTypeToAdd = this.oscillatorTypeToAdd;
        
        if (this.authoringComponentContent.oscillatorTypes.indexOf(oscillatorTypeToAdd) != -1) {
            // the oscillator type is already in the array of oscillator types
            
            alert('Error: You have already added ' + oscillatorTypeToAdd);
        } else {
            // the oscillator type is not already in the array of oscillator types
            this.authoringComponentContent.oscillatorTypes.push(oscillatorTypeToAdd);
            
            // hide the oscillator type chooser
            this.showOscillatorTypeChooser = false;
            
            // perform preview updating and project saving
            this.authoringViewComponentChanged();
        }
    }
    
    /**
     * The author has clicked the cancel button for adding an oscillator type
     */
    authoringCancelOscillatorTypeClicked() {
        // hide the oscillator type chooser
        this.showOscillatorTypeChooser = false;
    }
    
    /**
     * The author has clicked the delete button for removing an oscillator type
     * @param index the index of the oscillator type to remove
     */
    authoringDeleteOscillatorTypeClicked(index) {
        
        // remove the oscillator type at the given index
        this.authoringComponentContent.oscillatorTypes.splice(index, 1);
        
        // perform preview updating and project saving
        this.authoringViewComponentChanged();
    }

    /**
     * Import work from another component
     */
    importWork() {

        // get the component content
        var componentContent = this.componentContent;

        if (componentContent != null) {

            var importWorkNodeId = componentContent.importWorkNodeId;
            var importWorkComponentId = componentContent.importWorkComponentId;

            if (importWorkNodeId != null && importWorkComponentId != null) {

                // get the latest component state for this component
                var componentState = this.StudentDataService.getLatestComponentStateByNodeIdAndComponentId(this.nodeId, this.componentId);

                /*
                 * we will only import work into this component if the student
                 * has not done any work for this component
                 */
                if(componentState == null) {
                    // the student has not done any work for this component

                    // get the latest component state from the component we are importing from
                    var importWorkComponentState = this.StudentDataService.getLatestComponentStateByNodeIdAndComponentId(importWorkNodeId, importWorkComponentId);

                    if (importWorkComponentState != null) {
                        /*
                         * populate a new component state with the work from the
                         * imported component state
                         */
                        var populatedComponentState = this.AudioOscillatorService.populateComponentState(importWorkComponentState);

                        // populate the component state into this component
                        this.setStudentWork(populatedComponentState);
                    }
                }
            }
        }
    };

    /**
     * Get the component id
     * @return the component id
     */
    getComponentId() {
        return this.componentContent.id;
    };

    /**
     * The component has changed in the regular authoring view so we will save the project
     */
    authoringViewComponentChanged() {

        // update the JSON string in the advanced authoring view textarea
        this.updateAdvancedAuthoringView();

        /*
         * notify the parent node that the content has changed which will save
         * the project to the server
         */
        this.$scope.$parent.nodeController.authoringViewNodeChanged();
    };

    /**
     * The component has changed in the advanced authoring view so we will update
     * the component and save the project.
     */
    advancedAuthoringViewComponentChanged() {

        try {
            /*
             * create a new component by converting the JSON string in the advanced
             * authoring view into a JSON object
             */
            var editedComponentContent = angular.fromJson(this.authoringComponentContentJSONString);

            // replace the component in the project
            this.ProjectService.replaceComponent(this.nodeId, this.componentId, editedComponentContent);

            // set the new component into the controller
            this.componentContent = editedComponentContent;

            /*
             * notify the parent node that the content has changed which will save
             * the project to the server
             */
            this.$scope.$parent.nodeController.authoringViewNodeChanged();
        } catch(e) {

        }
    };

    /**
     * Update the component JSON string that will be displayed in the advanced authoring view textarea
     */
    updateAdvancedAuthoringView() {
        this.authoringComponentContentJSONString = angular.toJson(this.authoringComponentContent, 4);
    };

    /**
     * Set the message next to the save button
     * @param message the message to display
     * @param time the time to display
     */
    setSaveMessage(message, time) {
        this.saveMessage.text = message;
        this.saveMessage.time = time;
    };

    /**
     * Register the the listener that will listen for the exit event
     * so that we can perform saving before exiting.
     */
    registerExitListener() {

        /*
         * Listen for the 'exit' event which is fired when the student exits
         * the VLE. This will perform saving before the VLE exits.
         */
        exitListener = this.$scope.$on('exit', angular.bind(this, function(event, args) {

        }));
    };
};

AudioOscillatorController.$inject = [
    '$injector',
    '$rootScope',
    '$scope',
    '$timeout',
    'NodeService',
    'AudioOscillatorService',
    'ProjectService',
    'StudentAssetService',
    'StudentDataService'
];

export default AudioOscillatorController;