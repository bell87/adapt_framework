define(function(require) {

    var Adapt = require("coreJS/adapt");
    var AdaptView = require('coreViews/adaptView');

    var DOMDiffer = new diffDOM();

    var ComponentViewDifferential = AdaptView.extend({

        className: function() {
            return "component "
            + this.model.get('_component')
            + "-component " + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility()
            + " component-" + this.model.get('_layout')
            + " nth-child-" + this.model.get("_nthChild");
        },

        initialize: function(){
			//standard initialization + renderState function
            this.view = new Backbone.Model({});
            this.redraw = _.debounce(this.redraw, 20);
            this.listenTo(this.model, "change", this.redraw);
            this.listenTo(this.view, "change", this.redraw);

            AdaptView.prototype.initialize.apply(this, arguments);
            this.renderState();
        },

        render: function() {
            Adapt.trigger(this.constructor.type + 'View:preRender', this);

            this.once("rendered", _.bind(function() {
                // don't call postRender after remove
                if(this._isRemoved) return;

                this.postRender();
                Adapt.trigger(this.constructor.type + 'View:postRender', this);
            }, this));

            return this.redraw();
        },

        redraw: function() {

            var template = Handlebars.templates[this.constructor.template];

            if (!this._diffDOM) {
                this._diffDOM = {
                    "old": document.createElement("div"),
                    "newer": document.createElement("div")
                };
            }

            this._diffDOM.old.innerHTML = this.el.innerHTML;
            this._diffDOM.newer.innerHTML = template(this.getRedrawData());

            var diff = DOMDiffer.diff(this._diffDOM.old, this._diffDOM.newer);
            
            if(diff.length > 0) {
                DOMDiffer.apply(this.el, diff);
                this.trigger('rendered');
            }

            return this
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

        renderState: function() {
            if (!Handlebars.partials['state']) return;

			// do not perform if component has .not-accessible class
            if (this.$el.is(".not-accessible")) return;
			// do not perform if component has .no-state class
            if (this.$el.is(".no-state")) return;

			//remove pre-exisiting states
            var $previousState = this.$(".accessibility-state").remove();

            //render and append state partial
            var $rendered = $(Handlebars.partials['state']( this.model.toJSON() ));

            //restore previous tab index if not on
            var previousTabIndex = $previousState.find(".aria-label").attr("tabindex");
            if (previousTabIndex == "-1") {
                $rendered.find(".aria-label").attr("tabindex", previousTabIndex);
            }

            this.$el.append( $rendered );

            this.listenToOnce(this.model, 'change:_isComplete', this.renderState);
        },

        postRender: function() {}

    }, {
        type:'component'
    });

    return ComponentViewDifferential;

});
