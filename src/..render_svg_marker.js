export function renderMapMarker({
}){

    let svgHtml = `
    <svg viewBox="0 0 24 24" overflow="visible" width="${size[0]}" height="${size[1]}">
    <defs>
     <path id="pathMarker" d="M12 23.5c0 0-7.5-4.5-7.5-12a1 1 0 1115 0c0 7-7.5 12-7.5 12z" />
      <linearGradient id="markerShadow" x1="0" x2="0" y1="0" y2="1">
        <stop stop-color="black" offset="10%" stop-opacity="0" />
        <stop stop-color="black" offset="100%" stop-opacity="0.6" />
      </linearGradient>
    </defs>
     <use href="#pathMarker" fill-opacity="0.5" transform="skewX(-45) scale(0.8 0.6)" transform-origin="12 24" fill="url(#markerShadow)" />
     <use href="#pathMarker" fill="${fill}" stroke="${stroke}" />
     <path d="M12 9a1 1 0 000 6 1 1 0 000-6z" fill="${fillInner}" />
  </svg>`;


  return svgHtml

}