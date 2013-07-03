# Patternslib/slides - a simple browser slideshow library

[Patternslib/slides](https://github.com/Patternslib/slides) is a minimal
slideshows library. It is minimal for several reasons:

* no dependencies on other javascript libraries
* no hardcoded styling

Even with its minimal design a number of interesting features is available:

* navigating between slides using swipe gestures
* multiple slideshows on a page

# Markup structure

A slideshow has a basic structure: a top level element which contains the
slideshow, which contains one or more slides. Each slide can optionally contain
presenter notes.

```html
<div class="slideshow">
  <div class="slide cover">
    <div class="slide-content">
      <section>
        <hgroup>
          <h1>Patternslib/slides</h1>
          <h2>Create slideshows in HTML 5</h2>
        </hgropu>
      </section>
    </div>
  </div>

  <div class="slide">
    <div class="slide-content">
      <section>
        <h1>Slide title>
        ...
      </section>
    </div>
  </div>
</div>
```

In presentation mode a number of class changes are made:

* The currently shown slide will get a ``active`` class.
* The slideshows container will get a ``mode-full`` class.
* The slideshow container will ``transform: scale(XX)`` style to make it fill the entire window

When not in presentation page the slideshow container will get a
``mode-list`` class.

# Controls

You can start a presentation by clicking on a slide. This will start the
presentation at the given slide. In presentation mode a number of keyboard
and swipe controls are available:

* Escape key: exit presentation
* PageUp, Up, and Left keys: go to previous slide
* PageDown, Down, Right and Space keys: go to next slide
* Home key: jump to the first slide
* End key: jump to the last slide
* Swipe left: go to the previous slide
* Swipe right: go to the next slide
* Swipe down: exit presentation

