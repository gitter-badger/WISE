define([
        'angular',
        'jquery',
        'jqueryUI',
        'angularAnimate',
        'angularDragDrop',
        'angularSortable',
        'angularUIRouter',
        'angularWebSocket',
        'configService',
        'projectService',
        'nodeApplicationService',
        'nodeService',
        'openResponseService',
        'portfolioService',
        'studentDataService',
        'webSocketService'
        ], function(angular, $) {

	var app = angular.module('app', [
	                                 'ui.router',
	                                 'ui.sortable',
	                                 'ngAnimate',
	                                 'ngDragDrop',
	                                 'ngWebSocket',
	                                 'ConfigService',
	                                 'ProjectService',
	                                 'NodeApplicationService',
	                                 'NodeService',
	                                 'OpenResponseService',
	                                 'PortfolioService',
	                                 'StudentDataService',
	                                 'WebSocketService'
	                                 ]);
	
	app.directive('compile', function($compile) {
        return function(scope, ele, attrs) {
            scope.$watch(
                    function(scope) {
                        return scope.$eval(attrs.compile);
                    },
                    function(value) {
                        ele.html(value);
                        $compile(ele.contents())(scope);
                    }
            );
        };
    });
	
	app.filter('sanitizeHTML', ['$sce', function($sce) {
	    return function(htmlCode) {
	        return $sce.trustAsHtml(htmlCode);
	    };
	}]);
	
	app.init = function() {
		angular.bootstrap(document, ['app']);
	};
	
	app.loadController = function(controllerName) {
		return ['$q', function($q) {
			var deferred = $q.defer();
			require([controllerName], function() {
				deferred.resolve();
			});
			return deferred.promise;
		}];
	};
	
	app.config(['$urlRouterProvider', '$stateProvider', '$controllerProvider', 
	            function($urlRouterProvider, $stateProvider, $controllerProvider) {
		
		$urlRouterProvider.otherwise('/studentProgress');
		
		app.$controllerProvider = $controllerProvider;
		
		$stateProvider
    		.state('root', {
                url: '',
                abstract: true,
                template: '<ui-view/>',
                resolve: {
                    classroomMonitorController: app.loadController('classroomMonitorController'),
                    portfolioController: app.loadController('portfolioController'),
                    config: function(ConfigService) {
                        var configUrl = window.configUrl;
                        
                        return ConfigService.retrieveConfig(configUrl);
                    },
                    project: function(ProjectService, config) {
                        return ProjectService.retrieveProject();
                    },
                    studentData: function(StudentDataService, config, project) {
                        return StudentDataService.retrieveStudentData();
                    },
                    webSocket: function(WebSocketService, config) {
                        return WebSocketService.initialize();
                    }
                }              
            })
            .state('root.studentProgress', {
                url: '/studentProgress',
                templateUrl: 'wise5/classroomMonitor/progress/student/studentProgress.html',
                controller: 'StudentProgressController',
                controllerAs: 'studentProgress',
                resolve: {
                    loadController: app.loadController('studentProgressController')
                }
            });
            
	}]);
	return app;
});