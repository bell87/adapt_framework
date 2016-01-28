define([
    "coreJS/adapt",
    'coreViews/adaptView',
    './basicViewDifferential'
], function(Adapt, AdaptView, BasicViewDifferential) {

    var DOMDiffer = new diffDOM();

    var ComponentViewDifferential = AdaptView.extend({

        redrawOn: undefined,
        redrawDebug: false,
        redrawDebugName: "n/a",

        className: function() {
            return "component "
            + this.model.get('_component')
            + "-component " + this.model.get('_id')
            + " " + this.model.get('_classes')
            + " " + this.setVisibility()
            + " component-" + this.model.get('_layout')
            + " nth-child-" + this.model.get("_nthChild");
        },

        initialize: function(options){
            options = options || {};

            this.state = options.state || new Backbone.Model({});
            this.redraw = _.debounce(this.redraw, 17);

            AdaptView.prototype.initialize.apply(this, arguments);
            
        },

        preRender: function() {},

        render: function() {
            Adapt.trigger(this.constructor.type + 'View:preRender', this);

            BasicViewDifferential.prototype.render.call(this, true);

            this.once("rendered", _.bind(function() {
                // don't call postRender after remove
                if(this._isRemoved) return;
                
                Adapt.trigger(this.constructor.type + 'View:postRender', this);
            }, this));

            return this;
        },

        redraw: BasicViewDifferential.prototype.redraw,

        getRedrawData: BasicViewDifferential.prototype.getRedrawData,

        postRender: function() {},

        remove: BasicViewDifferential.prototype.remove,

        empty: BasicViewDifferential.prototype.empty,

        detach: BasicViewDifferential.prototype.detach

    }, {
        type:'component'
    });

    return ComponentViewDifferential;

});
