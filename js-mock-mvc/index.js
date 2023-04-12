var myApp = {};

myApp.Model = function () {
  this.val = 0;

  this.add = function (v) {
    this.val += v;
  };

  this.sub = function (v) {
    this.val -= v;
  };

  var self = this,
    views = [];

  this.register = function (view) {
    views.push(view);
  };

  this.notify = function () {
    for (let i = 0; i < views.length; i++) {
      views[i].render(self);
    }
  };
};

myApp.View = function (controller) {
  var $num = $("#num"),
    $increase = $("#increase"),
    $decrease = $("#decrease");

  this.render = function (model) {
    $num.text(model.val + "rem");
  };

  $increase.click(controller.increase);
  $decrease.click(controller.decrease);
};

myApp.Controller = function () {
  var view, model;
  this.init = function () {
    model = new myApp.Model();
    view = new myApp.View(this);

    model.register(view);
    model.notify();
  };

  this.increase = function () {
    model.add(1);
    model.notify();
  };

  this.decrease = function () {
    model.sub(1);
    model.notify();
  };
};

(function () {
  var controller = new myApp.Controller();
  controller.init();
})();
