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
        el.className+=" " + name;
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
                return this._getText(this.presentation.slide_title_selector);
        },

        notes: function() {
                return this._getText(this.presentation.slide_notes_selector);
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

        _getText: function(selector) {
                var el = this.element.querySelector(selector);
                return el.text;
        }

};


//////////////////////////////////////////////////////////////////////
function Notes(presentation) {
}

Notes.prototype={
        window: null,
        document: null,
        timer_inter: null,
        time_start: null,
        global_onunload: null,

        open: function(notes) {
                if (this.window===null)
                        this.window=window.open("about:blank", "presenter-notes", "menubar=no,personalbar=no,location=no,status=no");
                if (this.window===null)
                        return false;
                this.document=this.window.document;
                this._addContent();
                this._startTimer();
                this.global_onunload=window.onunload;
                window.onunload=this._onUnload.bind(this);
                return true;
        },

        close: function(notes) {
                this._stopTimer();
                window.onunload=this.global_ununload;
                if (this.window!==null) {
                        this.window.close();
                        this.window=null;
                }
        },

        _addContent: function() {
                var body = this.document.body,
                    timer, span;

                timer=this.document.createElement("div");
                timer.id="timer";
                span=this.document.createElement("span");
                span.className="hour";
                span.appendChild(this.document.createTextNode("00"));
                timer.appendChild(span);
                timer.appendChild(this.document.createTextNode(":"));
                span=this.document.createElement("span");
                span.className="minute";
                span.appendChild(this.document.createTextNode("00"));
                timer.appendChild(span);
                timer.appendChild(this.document.createTextNode(":"));
                span=this.document.createElement("span");
                span.className="second";
                span.appendChild(this.document.createTextNode("00"));
                timer.appendChild(span);
                body.appendChild(timer);
        },

        _onUnload: function() {
                if (this.global_onunload!==null)
                        this.global_onunload();
                this.close();
        },

        _startTimer: function() {
                this.time_start=new Date();
                this._updateTimer();
                setInterval(this._updateTimer.bind(this), 1000);
        },

        _stopTimer: function() {
                if (this.timer_interval!==null) {
                        clearInterval(this.timer_interval);
                        this.timer_interval=null;
                }
        },

        _twoDigitNumber: function(num) {
                var buf = num.toString();
                return buf.length>1 ? buf : "0"+buf;
        },

        _updateTimer: function() {
                var delta = new Date(new Date()-this.time_start),
                    digits = this._twoDigitNumber;
                this.document.querySelector("#timer .hour").firstChild.textContent=delta.getUTCHours();
                this.document.querySelector("#timer .minute").firstChild.textContent=digits(delta.getUTCMinutes());
                this.document.querySelector("#timer .second").firstChild.textContent=digits(delta.getUTCSeconds());
        },

};


//////////////////////////////////////////////////////////////////////

function Presentation(container) {
        this.container=container;
        removeClass(this.container, "mode-full");
        addClass(this.container, "mode-list");
        this.scan();
        this.events=new EventTracker();
}


Presentation.prototype={
        // Notes instance
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

        // Identifier of touch event being tracked
        touch_identifier: null,

        // Page position where a touch event started.
        touch_start_position: null,

        // Last seen page position during a touch.
        touch_last_position: null,

        start: function(slide) {
                if (this.running)
                        return;

                this.running=true;
                if (this.current_slide_index===null) {
                        this.current_slide_index=[0];
                        this.slides[0].markActive();
                }

                addClass(document.body, "slideshow-running");
                addClass(this.container, "mode-full");
                removeClass(this.container, "mode-list");
                this._scaleDocument();
                this.events.add(window, "resize", this._scaleDocument, this);
                this.events.add(document, "keydown", this._onKey, this);
                this.events.add(document, "touchstart", this._onTouchStart, this);
                this.notes_window=new Notes();
                this.notes_window.open();
        },

        stop: function(slide) {
                if (!this.running)
                        return;
                this.running=false;

                this.events.removeAll();
                removeClass(this.container, "mode-full");
                addClass(this.container, "mode-list");
                removeClass(document.body, "slideshow-running");
                this._applyScale(1);
                if (this.notes_window!==null) {
                        this.notes_window.close();
                        this.notes_window=null;
                }
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
                this.container.style.WebkitTransform=style;
                this.container.style.MozTransform=style;
                this.container.style.msTransform=style;
                this.container.style.OTransform=style;
                this.container.style.transform=style;
        },

        _scaleDocument: function() {
                var el = this.slides[0].element;
                var ratio = 1/Math.max(el.clientWidth/window.innerWidth,
                                       el.clientHeight/window.innerHeight);
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
                                event.preventDefault();
                                this.previous();
                                break;

                        case 32: // Space
                        case 34: // PageDown
                        case 39: // Right
                        case 40: // Down
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
                this.touch_identifier=event.touches[0].identifier;
                this.touch_start_position=[event.touches[0].pageX, event.touches[0].pageY];
                this.touch_last_position=[event.touches[0].pageX, event.touches[0].pageY];
                this.events.add(document, "touchmove", this._onTouchMove, this);
                this.events.add(document, "touchend", this._onTouchEnd, this);
                this.events.add(document, "touchcancel", this._onTouchCancel, this);
        },

        _onTouchMove: function(event) {
                for (var i=0; i<event.touches.length; i++)
                        if (event.touches[i].identifier===this.touch_identifier) {
                                this.touch_last_position[0]=event.touches[i].pageX;
                                this.touch_last_position[1]=event.touches[i].pageY;
                                event.preventDefault();
                                break;
                        }
        },

        _onTouchEnd: function(event) {
                for (var i=0; i<event.changedTouches.length && this.touch_identifier!==null; i++)
                        if (event.changedTouches[i].identifier===this.touch_identifier) {
                                this.touch_identifier=null;
                                var delta_x = this.touch_start_position[0]-this.touch_last_position[0],
                                    delta_y = this.touch_start_position[1]-this.touch_last_position[1],
                                    offset_x = Math.abs(delta_x),
                                    offset_y = Math.abs(delta_y);

                                if (Math.max(offset_x, offset_y)<50)
                                        continue;

                                if (offset_x>offset_y) {
                                        if (delta_x<0)
                                                this.previous();
                                        else
                                                this.next();
                                } else if (delta_y<0)
                                        this.stop();
                        }
        },

        _onTouchCancel: function() {
                this.touch_identifier=null;
                this.touch_start_position=null;
                this.touch_last_position=null;
                this.events.remove(document, "touchmove", this._onTouchMove);
                this.events.remove(document, "touchend", this._onTouchEnd);
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
        }
};

window.Presentation=Presentation;
})();
