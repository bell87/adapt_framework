define([
    "coreJS/adapt",
    'coreViews/adaptView'
], function(Adapt, AdaptView) {

    var DOMDiffer = new diffDOM();

    var BasicViewDifferential = Backbone.View.extend({

        redrawOn: undefined,
        redrawDebug: false,
        redrawDebugName: "n/a",

        initialize: function(options){
            options = options || {};

            this.state = options.state || new Backbone.Model({});
            this.redraw = _.debounce(this.redraw, 17);

            this._isRemoved = false;

            this.listenToOnce(Adapt, "remove", this.remove);
            
            this.preRender();
            this.render();
        },

        preRender: function() {},

        render: function() {

            this.once("rendered", _.bind(function() {
                // don't call postRender after remove
                if(this._isRemoved) return;

                function filterRedraw(model, value) {
                    var shouldRedraw = false;
                    switch (typeof this.redrawOn) {
                    case "undefined":
                        shouldRedraw = true;
                        break;
                    case "object":
                        var changedKeys = _.keys(model.changed);
                        shouldRedraw =_.some(changedKeys, _.bind(function(key) {
                            return _.contains(this.redrawOn, key);
                        }, this));
                        if (shouldRedraw && this.redrawDebug) {
                            console.log(this.model.get("_id"), this.redrawDebugName, "keys changed", changedKeys.join(","));
                        }
                        break;
                    case "function":
                        shouldRedraw = this.redrawOn(model, value);
                        break;
                    }
                    

                    if (shouldRedraw) {
                        return this.redraw();
                    }
                }
                
                //start listening for view update changes
                this.listenTo(this.model, "change", filterRedraw);
                this.listenTo(this.state, "change", filterRedraw);
            
                this.postRender();

            }, this));

            return this.redraw(true);
        },

        redraw: function(initial) {

            if (this._isRemoved) return this;

            var startTime = (new Date()).getTime();

            var template = Handlebars.templates[this.constructor.template];

            if (initial === true) {
                //first render loads straight into DOM
                this.el.innerHTML = template(this.getRedrawData());
                if (this.redrawDebug) console.log(this.model.get("_id"), this.redrawDebugName, "rendered - ", (new Date()).getTime() - startTime+"ms");
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
            
            if (this.redrawDebug) console.log(this.model.get("_id"), this.redrawDebugName, "redraw: created differential - ", (new Date()).getTime() - startTime+"ms");

            if(diff.length > 0) {
                startTime = (new Date()).getTime();
                DOMDiffer.apply(this.el, diff);
                if (this.redrawDebug) console.log(this.model.get("_id"), this.redrawDebugName, "redraw: changed DOM - ", (new Date()).getTime() - startTime+"ms");
                _.defer(_.bind(function() {
                    this.trigger('rendered');
                }, this));
            } else {
                if (this.redrawDebug) console.log(this.model.get("_id"), this.redrawDebugName, "redraw: unfounded diff - no changes found");
            }

            return this;
        },

        getRedrawData: function() {

            var state;
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

            if (this.state) {
                if (this.state.toJSON) {
                    state = this.state.toJSON();
                } else {
                    state = this.state;
                }
            }

            var rtn = _.extend({}, state, model, state);
            
            rtn.state = state;
            rtn.model = model;
            rtn.collection = collection;

            return rtn;

        },

        remove: function() {
            this.$el.remove();
            this.detach();
        },

        empty: function() {
            this.$el.empty();
            this.detach();
        },

        detach: function() {
            this._isRemoved = true;
            this.undelegateEvents();
            this.stopListening();
            this.el = undefined;
            this.$el = undefined;
            this.state = undefined;
            this.model = undefined;
            this.collection = undefined;
        }

    });

    return BasicViewDifferential;

});
