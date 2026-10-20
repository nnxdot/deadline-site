// Provider marks for the DEADLINE Next pages. Files, source and license: logos/README.md. All served locally.
// Monochrome marks are masks in the text colour, so they follow the theme; colour marks keep their brand colours.
'use strict';
window.providerLogo = (function () {
  const MARKS = {
    openai: {file: 'openai'}, 'z.ai': {file: 'zai'}, zai: {file: 'zai'}, minimax: {file: 'minimax', color: true},
    anthropic: {file: 'anthropic'}, google: {file: 'google'}, deepseek: {file: 'deepseek', color: true}, meta: {file: 'meta'},
    mistral: {file: 'mistral'}, qwen: {file: 'qwen'}, alibaba: {file: 'qwen'}, xai: {file: 'xai'},
  };
  return provider => {
    const m = MARKS[String(provider || '').trim().toLowerCase()] || {file: 'generic'};
    const url = 'logos/' + m.file + '.svg?v=3';
    return m.color ? `<img class="plogo" src="${url}" width="16" height="16" alt="" aria-hidden="true">`
                   : `<span class="plogo" style="-webkit-mask-image:url('${url}');mask-image:url('${url}')" aria-hidden="true"></span>`;
  };
})();
