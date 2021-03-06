'use strict';

class AuthoringToolController {

    constructor($filter,
                $location,
                $mdDialog,
                $scope,
                $timeout,
                ConfigService,
                ProjectService,
                SessionService) {

        this.$filter = $filter;
        this.$location = $location;
        this.$mdDialog = $mdDialog;
        this.$scope = $scope;
        this.$timeout = $timeout;
        this.$translate = this.$filter('translate');
        this.ConfigService = ConfigService;
        this.ProjectService = ProjectService;
        this.SessionService = SessionService;

        // the global message that shows up at the top right of the authoring tool
        this.globalMessage = {
            text: '',
            time: ''
        };

        $scope.$on('showSessionWarning', () => {

            // Append dialog to document.body
            let confirm = this.$mdDialog.confirm()
                .parent(angular.element(document.body))
                .title(this.$translate('sessionTimeout'))
                .content(this.$translate('autoLogoutMessage'))
                .ariaLabel(this.$translate('sessionTimeout'))
                .ok(this.$translate('yes'))
                .cancel(this.$translate('no'));
            this.$mdDialog.show(confirm).then(() => {
                this.SessionService.renewSession();
            }, () => {
                this.SessionService.forceLogOut();
            });
        });

        // alert user when inactive for a long time
        this.$scope.$on('showRequestLogout', (ev) => {

            let alert = this.$mdDialog.confirm()
                .parent(angular.element(document.body))
                .title(this.$translate('serverUpdate'))
                .textContent(this.$translate('serverUpdateRequestLogoutMessage'))
                .ariaLabel(this.$translate('serverUpdate'))
                .targetEvent(ev)
                .ok(this.$translate('ok'));

            this.$mdDialog.show(alert).then(() => {
                // do nothing
            }, () => {
                // do nothing
            });
        });

        /*
         * Listen for the savingProject event which means the authoring tool
         * is in the process of saving the project
         */
        this.$scope.$on('savingProject', () => {
            // display the message to show that the project is being saved
            this.setGlobalMessage(this.$translate('saving'), null);
        });

        /*
         * Listen for the projectSaved event which means the project has just
         * been saved to the server
         */
        this.$scope.$on('projectSaved', () => {

            /*
             * Wait half a second before changing the message to 'Saved' so that
             * the 'Saving...' message stays up long enough for the author to
             * see that the project is saving. If we don't perform this wait,
             * it will always say 'Saved' and authors may wonder whether the
             * project ever gets saved.
             */
            this.$timeout(() => {
                // get the current time stamp and set the 'Saved' message
                var clientSaveTime = new Date().getTime();
                this.setGlobalMessage(this.$translate('SAVED'), clientSaveTime);
            }, 500);
        });

        /*
         * Open the asset chooser to let the author insert an asset into the
         * specified target
         */
        this.$scope.$on('openAssetChooser', (event, params) => {
            // create the params for opening the asset chooser
            var stateParams = {};
            stateParams.popup = params.popup;
            stateParams.projectId = params.projectId;
            stateParams.nodeId = params.nodeId;
            stateParams.componentId = params.componentId;
            stateParams.target = params.target;

            // open the dialog that will display the assets for the user to choose
            this.$mdDialog.show({
                templateUrl: 'wise5/authoringTool/asset/asset.html',
                controller: 'ProjectAssetController',
                controllerAs: 'projectAssetController',
                $stateParams: stateParams,
                clickOutsideToClose: true,
                escapeToClose: true
            });
        });

        /*
         * Open the asset chooser to let the author insert an WISE Link into the
         * specified target
         */
        this.$scope.$on('openWISELinkChooser', (event, params) => {

            // create the params for opening the WISE Link authoring popup
            var stateParams = {};
            stateParams.projectId = params.projectId;
            stateParams.nodeId = params.nodeId;
            stateParams.componentId = params.componentId;
            stateParams.target = params.target;

            // open the WISE Link authoring popup
            this.$mdDialog.show({
                templateUrl: 'wise5/authoringTool/wiseLink/wiseLinkAuthoring.html',
                controller: 'WISELinkAuthoringController',
                controllerAs: 'wiseLinkAuthoringController',
                $stateParams: stateParams,
                clickOutsideToClose: true,
                escapeToClose: true
            });
        });
    }

    /**
     * Check if the author is on the My Projects page in the Authoring Tool
     * @returns whether the author is on the My Projects page in the Authoring
     * Tool
     */
    isAuthorOnMyProjectsPage() {
        var result = false;

        if (this.$location.url() == '/') {
            /*
             * the author is on the My Projects page. the url looks like
             * http://wise.berkeley.edu/author#/
             */
            result = true;
        }

        return result;
    }

    /**
     * Navigate the user to the My Projects page in the Authoring Tool
     */
    goToMyProjects() {
        // send the user to the My Projects page in the Authoring Tool
        this.$location.url('/author');
    }

    /**
     * The user has moved the mouse so
     */
    mouseMoved() {
        /*
         * notify the Session Service that the user has moved the mouse
         * so we can refresh the session
         */
        this.SessionService.mouseMoved();
    }

    exit() {
        // notify others that we've finished authoring
        this.ProjectService.notifyAuthorProjectEnd().then(() => {
            // send the user to the teacher home page
            let wiseBaseURL = this.ConfigService.getWISEBaseURL();
            let teacherHomePageURL = wiseBaseURL + '/teacher';
            window.location = teacherHomePageURL;
        })
    }

    /**
     * Set the global message at the top right
     * @param message the message to display
     * @param time the time to display
     */
    setGlobalMessage(message, time) {
        this.globalMessage.text = message;
        this.globalMessage.time = time;
    };
}

AuthoringToolController.$inject = [
    '$filter',
    '$location',
    '$mdDialog',
    '$scope',
    '$timeout',
    'ConfigService',
    'ProjectService',
    'SessionService',
    'moment'
];

export default AuthoringToolController;
