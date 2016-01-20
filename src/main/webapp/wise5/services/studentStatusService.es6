class StudentStatusService {
    constructor($http, ConfigService, ProjectService) {
        this.$http = $http;
        this.ConfigService = ConfigService;
        this.ProjectService = ProjectService;
        this.studentStatuses = null;

        this.newNodeVisits = [];
    }

    retrieveStudentStatuses(config) {
        var studentStatusURL = this.ConfigService.getStudentStatusURL();
        var runId = this.ConfigService.getRunId();

        var requestConfig = {
            params: {
                runId: runId
            }
        };

        return this.$http.get(studentStatusURL, requestConfig).then(angular.bind(this, function(result) {
            var studentStatuses = result.data;

            this.studentStatuses = studentStatuses;

            return studentStatuses;
        }));
    };

    getStudentStatuses() {
        return this.studentStatuses;
    };

    getCurrentNodeTitleForWorkgroupId(workgroupId) {
        var nodeTitle = null;

        var studentStatus = this.getStudentStatusForWorkgroupId(workgroupId);

        if(studentStatus != null) {
            var currentNodeId = studentStatus.currentNodeId;
            nodeTitle = this.ProjectService.getNodeTitleByNodeId(currentNodeId);
        }

        return nodeTitle;
    };

    getNewNodeVisits() {
        return this.newNodeVisits;
    };

    addNewNodeVisit(nodeVisit) {
        this.newNodeVisits.push(nodeVisit);
    };

    getStudentStatusForWorkgroupId(workgroupId) {

        var studentStatus = null;
        var studentStatuses = this.getStudentStatuses();

        for (var x = 0; x < studentStatuses.length; x++) {
            var tempStudentStatus = studentStatuses[x];

            if (tempStudentStatus != null) {
                var tempWorkgroupId = tempStudentStatus.workgroupId;

                if (workgroupId == tempWorkgroupId) {
                    studentStatus = tempStudentStatus;
                    break;
                }
            }
        }

        return studentStatus;
    };

    setStudentStatusForWorkgroupId(workgroupId, studentStatus) {

        var studentStatuses = this.getStudentStatuses();

        for (var x = 0; x < studentStatuses.length; x++) {
            var tempStudentStatus = studentStatuses[x];

            if (tempStudentStatus != null) {
                var tempWorkgroupId = tempStudentStatus.workgroupId;

                if (workgroupId === tempWorkgroupId) {
                    studentStatuses.splice(x, 1, studentStatus);
                    break;
                }
            }
        }
    };

    getAvatarColorForWorkgroupId(workgroupId) {
        var avatarColors = ['#E91E63', '#9C27B0', '#CDDC39', '#2196F3', '#FDD835', '#43A047', '#795548', '#EF6C00', '#C62828', '#607D8B'];
        var modulo = workgroupId % 10;
        return avatarColors[modulo];
    };

}

StudentStatusService.$inject = ['$http', 'ConfigService', 'ProjectService'];

export default StudentStatusService;