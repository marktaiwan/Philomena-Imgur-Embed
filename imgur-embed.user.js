// ==UserScript==
// @name        Philomena Imgur Embed
// @description Upload and embed images directly from the comment form
// @version     1.0.2
// @author      Marker
// @license     MIT
// @namespace   https://github.com/marktaiwan/
// @homepageURL https://github.com/marktaiwan/Philomena-Imgur-Embed
// @supportURL  https://github.com/marktaiwan/Philomena-Imgur-Embed/issues
// @match       https://*.ponybooru.org/*
// @match       https://*.ponerpics.com/*
// @match       https://*.ponerpics.org/*
// @match       https://*.derpibooru.org/*
// @match       https://*.trixiebooru.org/*
// @match       https://*.twibooru.org/*
// @require     https://raw.githubusercontent.com/soufianesakhi/node-creation-observer-js/master/release/node-creation-observer-latest.js
// @inject-into content
// @noframes
// @grant       GM_xmlhttpRequest
// ==/UserScript==
(function () {
  'use strict';

  /* Shorthands  */
  function $(selector, root = document) {
    return root.querySelector(selector);
  }
  function create(ele) {
    return document.createElement(ele);
  }

  const CLIENT_ID = '7e765c56f350231';
  const API_ENDPOINT = 'https://api.imgur.com/3/image';
  const boorus = {
    ponybooru: {
      booruDomains: ['ponybooru.org'],
      syntax: 'markdown',
    },
    ponerpics: {
      booruDomains: ['ponerpics.org', 'ponerpics.com'],
      syntax: 'textile',
    },
    twibooru: {
      booruDomains: ['twibooru.org', 'twibooru.com'],
      syntax: 'markdown',
    },
    derpibooru: {
      booruDomains: ['derpibooru.org', 'trixiebooru.org', 'ronxgr5zb4dkwdpt.onion'],
      syntax: 'markdown',
    },
  };
  var IconState;
  (function (IconState) {
    IconState[(IconState['idle'] = 0)] = 'idle';
    IconState[(IconState['loading'] = 1)] = 'loading';
    IconState[(IconState['error'] = 2)] = 'error';
  })(IconState || (IconState = {}));
  function getSiteSyntax() {
    const host = window.location.host;
    for (const booru of Object.values(boorus)) {
      if (booru.booruDomains.indexOf(host) >= 0) return booru.syntax;
    }
    throw new Error('Unable to match domain');
  }
  function wrapLink(link) {
    switch (getSiteSyntax()) {
      case 'textile':
        return `!${link}!`;
      case 'markdown':
        return `![](${link})`;
    }
  }
  function getFile() {
    return new Promise(resolve => {
      const filePicker = create('input');
      filePicker.type = 'file';
      filePicker.multiple = false;
      filePicker.accept = 'image/png, image/gif, image/jpeg';
      filePicker.style.display = 'none';
      document.documentElement.append(filePicker);
      filePicker.click();
      filePicker.addEventListener(
        'input',
        e => {
          const filePicker = e.currentTarget;
          const files = filePicker.files;
          if (!files || files.length == 0) {
            resolve(null);
          } else {
            resolve(files[0]);
          }
          filePicker.remove();
        },
        {once: true}
      );
    });
  }
  function setIcon(button, state) {
    switch (state) {
      case IconState.idle:
        button.innerHTML = '<i class="fa fa-file-upload"></i>';
        break;
      case IconState.loading:
        button.innerHTML = '<i class="fa fa-spinner fa-pulse"></i>';
        break;
      case IconState.error:
        button.innerHTML = '<i class="fa fa-exclamation-triangle"></i>';
        break;
    }
  }
  function getBase64(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function () {
        resolve(reader.result.split(',')[1]);
      };
    });
  }
  function insertString(newString, textarea) {
    const {selectionStart: start, selectionEnd: end} = textarea;
    const text = textarea.value;
    const selection = text.substring(start, end);
    const leadingSpaces = selection.match(/^\s*/)?.toString() ?? '';
    const trailingSpaces = selection.match(/\s*$/)?.toString() ?? '';
    const beforeSelection = text.substring(0, start);
    const afterSelection = text.substring(end);
    textarea.value = beforeSelection + leadingSpaces + newString + trailingSpaces + afterSelection;
    textarea.selectionStart = beforeSelection.length + leadingSpaces.length + newString.length;
    textarea.selectionEnd = textarea.selectionStart;
    textarea.focus();
  }
  async function uploadFile(image, filename) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('image', image);
      if (filename) formData.append('name', filename);
      const request = new Response(formData);
      request.text().then(body => {
        GM_xmlhttpRequest({
          url: API_ENDPOINT,
          method: 'POST',
          headers: {
            Authorization: `Client-ID ${CLIENT_ID}`,
            'Content-Type': request.headers.get('Content-Type'),
          },
          data: body,
          responseType: 'json',
          onload: resp => {
            const {response} = resp;
            if (response.status !== 200) reject('unexpected status code');
            resolve(response.data.link);
          },
          onerror: reject,
        });
      });
    });
  }
  async function buttonClickHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const imgurButton = e.currentTarget;
    const toolbar = imgurButton.closest('.communication__toolbar');
    const textfield = $('.js-toolbar-input', toolbar.parentElement);
    const image = await getFile();
    if (!image) return;
    imgurButton.disabled = true;
    setIcon(imgurButton, IconState.loading);
    try {
      const base64EncodedImage = await getBase64(image);
      const imageLink = await uploadFile(base64EncodedImage, image.name);
      insertString(wrapLink(imageLink), textfield);
      setIcon(imgurButton, IconState.idle);
      imgurButton.disabled = false;
    } catch (e) {
      imgurButton.classList.add('danger');
      setIcon(imgurButton, IconState.error);
      throw e;
    }
  }
  NodeCreationObserver.init('imgur-embed-observer');
  NodeCreationObserver.onCreation('.communication__toolbar', toolbar => {
    const imageButton = $('[data-syntax-id="image"]', toolbar);
    const imgurButton = create('button');
    imgurButton.classList.add('communication__toolbar__button');
    imgurButton.tabIndex = -1;
    imgurButton.title = 'upload and insert image';
    setIcon(imgurButton, IconState.idle);
    imgurButton.addEventListener('click', buttonClickHandler, {capture: true});
    imageButton.after(imgurButton);
  });
})();
