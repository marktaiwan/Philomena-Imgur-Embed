import type NodeCreationObserverInterface from '../types/NodeCreationObserver';
import type ImgurUploadResponse from '../types/Imgur';
import {$, create} from './util';

declare const NodeCreationObserver: NodeCreationObserverInterface;

const CLIENT_ID = '7e765c56f350231';
const API_ENDPOINT = 'https://api.imgur.com/3/image';

enum IconState {
  idle,
  loading,
  error,
}

function getFile(): Promise<File | null> {
  return new Promise(resolve => {
    const filePicker = create('input');
    filePicker.type = 'file';
    filePicker.multiple = false;
    filePicker.accept = 'image/png, image/gif, image/jpeg';
    filePicker.style.display = 'none';
    document.documentElement.append(filePicker);
    filePicker.click();
    filePicker.addEventListener('input', e => {
      const filePicker = e.currentTarget as HTMLInputElement;
      const files = filePicker.files;
      if (!files || files.length == 0) {
        resolve(null);
      } else {
        resolve(files[0]);
      }
      filePicker.remove();
    }, {once: true});
  });
}

function setIcon(button: HTMLButtonElement, state: IconState): void {
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

function getBase64(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      resolve((reader.result as string).split(',')[1]);
    };
  });
}

function insertString(newString: string, textarea: HTMLTextAreaElement): void {
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

async function uploadFile(image: string, filename?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('image', image);
    if (filename) formData.append('name', filename);
    const request = new Response(formData);
    request
      .text()
      .then(body => {
        GM_xmlhttpRequest({
          url: API_ENDPOINT,
          method: 'POST',
          headers: {
            'Authorization': `Client-ID ${CLIENT_ID}`,
            'Content-Type': request.headers.get('Content-Type')!,
          },
          data: body,
          responseType: 'json',
          onload: resp => {
            const {response}: {response: ImgurUploadResponse} = resp;
            if (response.status !== 200) reject('unexpected status code');
            resolve(response.data.link);
          },
          onerror: reject,
        });
      });
  });
}

async function buttonClickHandler(e: MouseEvent): Promise<void> {
  e.preventDefault();
  e.stopPropagation();

  const imgurButton = e.currentTarget as HTMLButtonElement;
  const toolbar = imgurButton.closest('.communication__toolbar')!;
  const textfield = $<HTMLTextAreaElement>('.js-toolbar-input', toolbar.parentElement!);

  const image = await getFile();
  if (!image) return;

  imgurButton.disabled = true;
  setIcon(imgurButton, IconState.loading);
  try {
    const base64EncodedImage = await getBase64(image);
    const imageLink = await uploadFile(base64EncodedImage, image.name);
    insertString(`!${imageLink}!`, textfield);
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
