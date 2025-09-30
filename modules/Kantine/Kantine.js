window.renderKantine = function renderKantine(root) {
  root.style.display = 'flex';
  root.style.alignItems = 'stretch';
  root.style.justifyContent = 'stretch';
  root.style.flexDirection = 'column';
  root.style.width = '100%';
  root.style.height = '100%';
  root.style.flex = '1 1 auto';
  root.innerHTML = `
    <iframe
      src="https://lufthansagroup-taste-and-more.signage-server.de/html-export/hamburg-betriebsrestaurant-1-de/index.html"
      title="Speiseplan – LHT Betriebsrestaurant 1"
      loading="lazy"
      referrerpolicy="no-referrer"
      style="border:0;width:100%;height:100%;flex:1;"
    ></iframe>
  `;
};
