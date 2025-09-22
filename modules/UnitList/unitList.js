window.renderUnitList = function(targetDiv, opts) {
  var mod = opts.moduleJson;
  var items = mod.items || [];

  // Generate a unique container ID in case there are multiple lists.
  var containerId = 'sortable-' + Math.floor(Math.random() * 100000);

  // Build the markup as an unordered list.
  // The LI elements use inline styling similar to your example.
  var html = "<ul id='" + containerId + "' style='list-style-type: none; margin: 0; padding: 0; width: 100%;'>";
  items.forEach(function(item) {
    html += "<li class='ui-state-default' style='margin: 0 5px 5px 5px; padding: 5px; font-size: 1.2em; height: 1.5em; line-height: 1.2em; background: #f0f0f0; border: 1px solid #ccc; cursor: move;'>" +
              item +
            "</li>";
  });
  html += "</ul>";
  
  targetDiv.innerHTML = html;

  // Initialize jQuery UI Sortable with the placeholder option, ensuring that the placeholder height matches the dragged item.
  if (typeof $ !== "undefined" && typeof $.fn.sortable !== "undefined") {
    $("#" + containerId).sortable({
      placeholder: "ui-state-highlight",
      forcePlaceholderSize: true,
      start: function(event, ui) {
        // Set the placeholder height to match the helper's (dragged item's) outer height.
        ui.placeholder.height(ui.helper.outerHeight());
      }
    });
    $("#" + containerId).disableSelection();
  } else {
    console.error("jQuery UI Sortable is not available. Please include jQuery and jQuery UI.");
  }
};