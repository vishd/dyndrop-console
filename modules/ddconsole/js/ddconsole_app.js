(function ($) {

angular.module('ddconsole.app', ['ddconsole.resource'])
  .directive('navlist',function() {
    return function(scope, elm, attrs) {
      $(".active",elm).append('<div class="arrow-left"></div>');
      scope.setActive = function(evt)
      {
        $(".arrow-left",elm).remove();
        $(".active",elm).removeClass("active");
        angular.element(evt.currentTarget).addClass("active");
        $(".active",elm).append('<div class="arrow-left"></div>');
      }

    };
  })
  .controller('ListCtrl', ['$scope', '$location', '$routeParams', 'Repo', 'User', function ($scope, $location, $routeParams, Repo, User) {
    var self = this;

    $scope.repo_is_supported = function(repo) {
      var language = repo.provider_data.language;
      return (language == "PHP" || language == "JavaScript" || language == undefined);
    }

  }])
  .controller('CreateFromRepoCtrl', ['$scope', '$location', '$routeParams', 'App', 'DDConsoleConfig', function ($scope, $location, $routeParams, App, DDConsoleConfig) {
    var self = this;
   
    $scope.free_plan_available = function() {
      var free_plan_count = 0;
      if($scope.repos != undefined) {
        for(var i = 0; i < $scope.repos.length; i++) {
          if($scope.repos[i].app != undefined && $scope.repos[i].app.plan == "free") {
            free_plan_count++;
          }
        }
      }
      return free_plan_count < 1;
    }

    $scope.repo_location = $routeParams.repo_org + "/" + $routeParams.repo_name;

    // Initiate basic App object
    $scope.app = new App();
    $scope.app.label = $routeParams.repo_name;
    $scope.$watch('repos', function() {
      $scope.app.plan = $scope.free_plan_available() ? "free" : "small";
    });

    app_instance = { "uris": [] };
    $scope.app.instances = [];
    $scope.app.instances[0] = app_instance;

    $scope.app.repo = {
      provider: "github",
      location: $scope.repo_location
    }

    $scope.save = function() {
      App.save($scope.app, function(app) {
        $scope.reload_repos();
        $location.path('/');
      });
    }

  }])
  .controller('ViewCtrl', ['$scope', '$location', '$routeParams', 'App', 'Repo', 'DDConsoleConfig', function ($scope, $location, $routeParams, App, Repo, DDConsoleConfig) {
    var self = this;
   
    Repo.get({org: $routeParams.repo_org, name: $routeParams.repo_name}, function(repo) {
      self.original = repo;
      $scope.repo = new Repo(self.original);

      if($scope.repo.app == null) {
        $location.path($location.path() + "/host");
      }

      $scope.app = new App($scope.repo.app);
    });

    $scope.setComponent = function(val) {
      $scope.component = val;
    }
    $scope.component = 'production-overview';

    $scope.update = function() {
      $scope.app.update(function() {
        $scope.reload_repos();
      });
    }

    $scope.destroy = function() {
      new App(self.original.app).destroy(function() {
        $scope.reload_repos();
        $location.path('/list');
      });
    }

    $scope.angular_templates_path = DDConsoleConfig.angular_templates;

  }])
.controller('ViewProductionDomainsCtrl', ['$scope', '$location', '$routeParams', 'App', 'DDConsoleConfig', function ($scope, $location, $routeParams, App, DDConsoleConfig) {
    var self = this;

    var dns_check = function() {
      $scope.app.dns_check(function(data) {
          $scope.dns_checks = [];
          for(var i = 0; i < data.length; i++) {
            $scope.dns_checks[data[i].uri] = data[i].check;
          }
        });
    }

    $scope.addExternalUri = function () {
      if($scope.new_external_uri != undefined) {
        var new_external_uri = $scope.new_external_uri;
        $scope.new_external_uri = '';
        $scope.app.instances[0].external_uris.push(new_external_uri);
        $scope.app.update(function() {
            $scope.reload_repos();
            dns_check();
            // TODO: No Jquery here!
            $('#external-uri-help-modal').modal('show');
          }, 
          function() {
            var index = $.inArray(new_external_uri, $scope.app.instances[0].external_uris);
            if(index >= 0) {
              $scope.app.instances[0].external_uris.splice(index);
            }
        });
      }
    }

    $scope.removeExternalUri = function(uri) {
      var index = $scope.app.instances[0].external_uris.indexOf(uri);
      if(index >= 0) {
        $scope.app.instances[0].external_uris.splice(index, 1);
        $scope.app.update(function() {
          $scope.reload_repos();
        });
      }
    }

    $scope.$watch('app', function(newValue, oldValue) {
      if(newValue != undefined) {
        dns_check();
      }
    });
    

  }])
  .controller('ViewConfigureProjectCtrl', ['$scope', '$location', '$routeParams', 'App', 'DDConsoleConfig', 'UserCard', function ($scope, $location, $routeParams, App, DDConsoleConfig, UserCard) {
    var self = this;

    var plan_register = function(plan_name) {
      //Register to the plan
      $scope.app.update_plan({
          name: plan_name
        }, function() {
          // Success
          $scope.reload_repos();
          $scope.app.plan = plan_name;
        });
    }

    $scope.updatePlan = function(plan_name) {
      //Check that the user have a credit card
      UserCard.query({user_id: "me"}, function(cards) {
        if(cards.length == 0 && plan_name != "free") {
          //Show the card-adding popup
          $scope.plan_being_chosen = plan_name;
          $('#add-card-modal').modal('show');
        }
        else {
          plan_register(plan_name);
        }
      });
    }

    $scope.$on('userCardAdded', function(mass) {
      $('#add-card-modal').modal('hide');
      plan_register($scope.plan_being_chosen);
    });

  }]);





})(jQuery);