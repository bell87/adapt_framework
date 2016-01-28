define([
    "coreJS/adapt",
    'coreViews/adaptView'
], function(Adapt, AdaptView) {

    var DOMDiffer = new diffDOM();

    var ComponentViewDifferential = Backbone.View.extend({

        initialize: function(options){
            options = options || {};

            this.view = options.view || new Backbone.Model({});
            this.redraw = _.debounce(this.redraw, 20);

            this.listenToOnce(Adapt, "remove", this.onRemove);
            
            this.preRender();
            this.render();
        },

        preRender: function() {},

        render: function() {

            this.once("rendered", _.bind(function() {
                // don't call postRender after remove
                if(this._isRemoved) return;
                
                //start listening for view update changes
                this.listenTo(this.model, "change", this.redraw);
                this.listenTo(this.view, "change", this.redraw);
            
                this.postRender();

            }, this));

            return this.redraw(true);
        },

        redraw: function(initial) {

            if (this._isRemoved) return this;

            var template = Handlebars.templates[this.constructor.template];

            if (initial === true) {
                //first render loads straight into DOM
                this.el.innerHTML = template(this.getRedrawData());
                _.defer(_.bind(function() {
                    this.trigger('rendered');
                }, this));
                return this;
            }
            
            //all renders except first do a DOM differential
            
            if (!this._diffDOM) {
                var old = document.createElement("div");
                var newer = document.createElement("div");
                this._diffDOM = {
                    "old": old,
                    "newer": newer
                };
            }

            this._diffDOM.old.innerHTML = this.el.innerHTML;
            this._diffDOM.newer.innerHTML = template(this.getRedrawData());

            var diff = DOMDiffer.diff(this._diffDOM.old, this._diffDOM.newer);
            
            if(diff.length > 0) {
                DOMDiffer.apply(this.el, diff);
                _.defer(_.bind(function() {
                    this.trigger('rendered');
                }, this));
            }

            return this;
        },

        getRedrawData: function() {

            var view
            var model;
            var collection;

            if (this.model) {
                if (this.model.toJSON) {
                    model = this.model.toJSON();
                } else {
                    model = this.model;
                }
            }

            if (this.collection) {
                if (this.collection.toJSON) {
                    collection = this.collection.toJSON();
                } else {
                    collection = this.collection;
                }
            }

            if (this.view) {
                if (this.view.toJSON) {
                    view = this.view.toJSON();
                } else {
                    view = this.view;
                }
            }

            var rtn = _.extend({}, view, model, view);
            
            rtn.view = view;
            rtn.model = model;
            rtn.collection = collection;

            return rtn;

        },

        onRemove: function() {
            this._isRemoved = true;
            this.remove();
        },

        empty: function() {
            this._isRemoved = true;
            this.undelegateEvents();
            this.stopListening();
            this.$el.empty();
        }

    }, {
        type:'component'
    });

    return ComponentViewDifferential;

});
