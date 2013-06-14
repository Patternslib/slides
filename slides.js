/** slides.js
 *
 * Copyright 2013 Simplon B.V. - Wichert Akkerman
 */

(function() {

var _whitespace = /[\t\r\n\f]/g;

function hasClass(el, name) {
        return (" " + el.className + " ").replace(this._whitespace, " ").indexOf(name)>=0;
}


function addClass(el, name) {
        if (hasClass(el, name))
                return;
        el.className+=" active";
}


function removeClass(el, name) {
        var classes = el.className.split(/\s+/);
        for (var i=0; i<classes.length; i++)
                if (classes[i]===name) {
                        classes.splice(i, 1);
                        el.className=classes.join(" ");
                        return;
                }
}


//////////////////////////////////////////////////////////////////////
function EventTracker() {
        this.listeners=[];
}

EventTracker.prototype={
        add: function(el, type, handler, context) {
                var bound_handler = handler.bind(context);
                this.listeners.push({el: el,
                                     type: type, 
                                     handler: handler,
                                     bound_handler: bound_handler});
                el.addEventListener(type, bound_handler);
        },

        remove: function(el, type, handler) {
                var listener;
                for (var i=0; i<this.listeners.length; i++) {
                        listener=this.listeners[i];
                        if (listener.el===el && listener.type===type && listener.handler===handler) {
                                listener.el.removeEventListener(listener.type, listener.bound_handler);
                                this.listeners.splice(i, 1);
                                break;
                        }
                }
        },

        removeAll: function() {
                var listener;
                for (var i=0; i<this.listeners.length; i++) {
                        listener=this.listeners[i];
                        listener.el.removeEventListener(listener.type, listener.bound_handler);
                }
                this.listeners=[];
        }
};


//////////////////////////////////////////////////////////////////////
function Slide(presentation, element, active) {
        this.presentation=presentation;
        this.element=element;
        this.id=element.id;
        this.active=!!active;
        element.addEventListener("click", this.onClick.bind(this));
}


Slide.prototype={
        title: function() {
                return this.getText(this.presentation.slide_title_selector);
        },

        notes: function() {
                return this.getText(this.presentation.slide_notes_selector);
        },

        onClick: function() {
                this.presentation._show(this);
        },

        markActive: function() {
                addClass(this.element, "active");
        },

        markInactive: function() {
                removeClass(this.element, "active");
        },

        getText: function(selector) {
                var el = this.element.querySelector(selector);
                return el.text;
        },

};

//////////////////////////////////////////////////////////////////////

function Presentation(container) {
        this.container=container;
        this.handlers=[];
        this.scan();
        this.events=new EventTracker();
};


Presentation.prototype={
        // Handle for the window containing the presentation notes.
        notes_window: null,

        // Flag if we are currently running in presentation mode.
        running: false,

        // Selector to find slides.
        slide_selector: ".slide",

        // Selector to find the title of a slide *from the slide*.
        slide_title_selector: "header",

        // Selector to find the presentation notes for a slide *from the slide*.
        slide_notes_selector: "footer",

        // The currently shown slide.
        current_slide_index: null,

        // X page position where a touch event started
        touch_start_x: null,

        showNotes: function(notes) {
                if (this.notes_window===false)
                        notes_window=window.open("about:blank", "presenter-notes", "menubar=no,personalbar=no,location=no,status=no");
                if (this.notes_window===null)
                        return;
        },

        start: function(slide) {
                if (this.running)
                        return;

                this.running=true;
                if (this.current_slide_index===null) {
                        this.current_slide_index=[0];
                        this.slides[0].markActive();
                }

                addClass(this.container, "presentation-running");
                this._scaleDocument();
                this.events.add(window, "resize", this._scaleDocument, this);
                this.events.add(document, "keydown", this._onKey, this);
                this.events.add(document, "touchstart", this._onTouchStart, this);
        },

        stop: function(slide) {
                if (!this.running)
                        return;
                this.running=false;

                this.events.removeAll();
                removeClass(this.container, "presentation-running");
                this._applyScale(1);
        },

        previous: function() {
                if (!this.running)
                        return;
                if (!this.current_slide_index)
                        return;
                this.slides[this.current_slide_index].markInactive();
                this.current_slide_index--;
                this.slides[this.current_slide_index].markActive();
        },

        next: function() {
                if (!this.running)
                        return;
                if (this.current_slide_index==(this.slides.length-1))
                        return;
                this.slides[this.current_slide_index].markInactive();
                this.current_slide_index++;
                this.slides[this.current_slide_index].markActive();
        },

        _applyScale: function(ratio) {
                var style = (ratio!=1) ? ("scale("+ratio+")") : "";
                document.body.style.WebkitTransform=style;
                document.body.style.MozTransform=style;
                document.body.style.msTransform=style;
                document.body.style.OTransform=style;
                document.body.style.transform=style;
        },

        _scaleDocument: function() {
                var ratio = 1/Math.max(document.body.clientWidth/window.innerWidth,
                                       document.body.clientHeight/window.innerHeight);
                console.debug("Scaling to ratio", ratio);
                this._applyScale(ratio);
        },

        _show: function(slide) {
                for (var i=0; i<this.slides.length; i++)
                        if (this.slides[i]===slide) {
                                this.current_slide_index=i;
                                slide.markActive();
                        } else
                                this.slides[i].markInactive();
                this.start();
        },

        _onKey: function(event) {
                switch (event.which) {
                        case 27: // Escape
                                event.preventDefault();
                                this.stop();
                                break;

                        case 33: // PageUp
                        case 38: // Up
                        case 37: // Left
                        case 72: // H
                        case 75: // K
                                event.preventDefault();
                                this.previous();
                                break;

                        case 32: // Space
                        case 34: // PageDown
                        case 39: // Right
                        case 40: // Down
                        case 74: // J
                        case 76: // L
                                event.preventDefault();
                                this.next();
                                break;

                        case 36: // Home
                                event.preventDefault();
                                this.first();
                                break;

                        case 35: // End
                                event.preventDefault();
                                this.last();
                                break;
                }
        },

        _onTouchStart: function(event) {
                if (event.touches.length!==1)
                        return;
                this.touch_start_x=event.touches[0].pageX;
                this.events.add(document, "touchmove", this._onTouchMove, this);
                this.events.add(document, "touchcancel", this._onTouchCancel, this);
        },

        _onTouchMove: function(event) {
                if (event.touches.length!==1 || this.touch_start_x===null)
                        return;

                event.preventDefault();
                var delta = event.touches[0].pageX-this.touch_start_x;
                if (Math.abs(delta)<50)
                        return;
                if (delta<0)
                        this.previous();
                else
                        this.next();
        },

        _onTouchCancel: function() {
                this.touch_start_x=null;
                this.events.remove(document, "touchmove", this._onTouchMove);
                this.events.remove(document, "touchcancel", this._onTouchCancel);
        },

        scan: function() {
                var elements = this.container.querySelectorAll(this.slide_selector);
                this.slides=[];
                this.current_slide_index=0;
                for (var i=0; i<elements.length; i++) {
                        var element = elements[i],
                            active = hasClass(element, "active");
                        this.slides.push(new Slide(this, element, active));
                        if (active)
                                this.current_slide_index=i;
                }
        },
};

window.Presentation=Presentation;
})();
