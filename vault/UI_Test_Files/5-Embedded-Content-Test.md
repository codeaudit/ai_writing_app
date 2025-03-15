---
id: doc-ui-test-embedded
createdAt: '2025-03-15T19:00:00.000Z'
updatedAt: '2025-03-15T19:00:00.000Z'
versions:
  - id: ver-ui-test-embedded-initial
    createdAt: '2025-03-15T19:00:00.000Z'
    message: Initial version
annotations: []
---

# Embedded Content Test

This document tests how the UI handles embedded content such as images, videos, and other media.

## Embedded Images

### Local Image (if supported)

![Local Image](../assets/sample-image.jpg)

### External Images

![External Image](https://via.placeholder.com/500x300)

![Another External Image](https://via.placeholder.com/800x400)

### Image with Caption

![Image with caption](https://via.placeholder.com/600x350)
*This is a caption for the image above*

## Embedded Documents

### Document Transclusion (if supported)

![[1-Formatting-Test#Tables]]

![[2-Backlinks-Test#Reference-Map]]

### Iframe Embedding (if supported)

<iframe src="https://www.example.com" width="100%" height="400" frameborder="0"></iframe>

## Embedded Media

### Audio (if supported)

<audio controls>
  <source src="https://example.com/sample-audio.mp3" type="audio/mpeg">
  Your browser does not support the audio element.
</audio>

### Video (if supported)

<video width="320" height="240" controls>
  <source src="https://example.com/sample-video.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

### YouTube Video (if supported)

<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Embedded Code

### Gist Embedding (if supported)

<script src="https://gist.github.com/anonymous/6cad326836d38bd3eeb969f7ad288bc5.js"></script>

### CodePen Embedding (if supported)

<iframe height="300" style="width: 100%;" scrolling="no" title="CodePen Example" src="https://codepen.io/team/codepen/embed/preview/PNaGbb" frameborder="no" loading="lazy" allowtransparency="true" allowfullscreen="true">
  See the Pen <a href="https://codepen.io/team/codepen/pen/PNaGbb">CodePen Example</a> by CodePen
</iframe>

## Embedded Maps

### Google Maps (if supported)

<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d387193.3059445135!2d-74.25986548248684!3d40.69714941932609!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sca!4v1647882654133!5m2!1sen!2sca" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>

## Mixed Embedded Content

This section combines multiple types of embedded content to test how the UI handles complex layouts.

![Mixed content image](https://via.placeholder.com/400x200)

<iframe src="https://www.example.com" width="100%" height="200" frameborder="0"></iframe>

![[3-Long-Document-Test#Section-1]]
