// Show interactive metadata table for a dataset (datasetName should match Data_Name)
function showMetadataTable(datasetName, high_use_threshold = 5) {
  var row = (window.databaseRecords || []).find(function (r) { return (r.Data_Name || '') === datasetName; });
  if (!row) {
    $('#metadata_container').html('<p>No metadata found for ' + datasetName + '</p>');
    return;
  }

  // and this is looking for the file at the Data_metadata file path
  var metadataPath = row.Data_Metadata || '';
  if (!metadataPath) {
    $('#metadata_container').html('<p>Metadata file missing for ' + datasetName + '</p>');
    return;
  }

  // Adjust the file path, done with AI and checked by me:
  // - If it already starts with '/' or is an absolute URL, keep it.
  // - Otherwise prefix '/' so "metadata/..." -> "/metadata/..."
  // This is necessary because the file path would just not work properly, regardless of format - I don't know what magic it's performing here that I couldn't replicate.
  // Might be worth fixing up later, but works for now.
  var metadataUrl = (/^[a-z]+:\/\//i.test(metadataPath) || metadataPath.startsWith('/'))
    ? metadataPath
    : ('/' + metadataPath.replace(/^\/+/, ''));
  
  console.log('showMetadataTable: dataset=', datasetName, ' metadataPath=', metadataPath, ' metadataUrl=', metadataUrl);

  // compute counts of variables used by papers for this dataset
  var counts = {};
  (window.databaseRecords || []).forEach(function (r) {
    if ((r.Data_Name || '') === datasetName) {
      var cols = (r.Paper_Metadata_Columns || '').split(';').map(function(s){ return s.trim(); }).filter(Boolean);
      cols.forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    }
  });

  // fetch & .then first checks to see if an object exists, and then only proceeds if it does.
  // Quick existence check so you get a clear error rather than a silent Papa.parse failure
  fetch(metadataUrl, { method: 'HEAD' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      // parse and render
      Papa.parse(metadataUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (res) {
          var data = res.data || [];
          if (!data.length) {
            $('#metadata_container').html('<p>Metadata file empty or could not be parsed.</p>');
            return;
          }

          // Build table
          var columns = Object.keys(data[0]);
          var $table = $('<table id="metadata_table" class="display" style="width:100%"></table>');
          var $thead = $('<thead></thead>');
          var $tr = $('<tr></tr>');

          columns.forEach(function (col) {
            var count = counts[col] || 0;
            if (count === 0) {
              // columns not used in any papers: leave uncoloured
              $tr.append($('<th></th>').text(col));
            } else {
              // the high use threshold defines the max colour. 
              // If =5, then any variable used 5+ times will be the same colour.
              // Also ensures that all datasets will follow the same colour scheme/scale.
              var ratio = Math.min(count / high_use_threshold, 1);
              function interp(a, b, t) { return Math.round(a + (b - a) * t); }
              var r = interp(255, 128, ratio), g = interp(255, 0, ratio), b = interp(0, 128, ratio);
              var color = 'rgb(' + r + ',' + g + ',' + b + ')';
              $tr.append($('<th></th>').text(col).css({ 'background-color': color, 'color': '#000' }));
            }
          });

          // When you use append like this, it ensures that the $tr is nested into the $thead opener and closer, analogous to: <thead> $tr </thead>
          $thead.append($tr);
          $table.append($thead);

          // Addign the rows
          var $tbody = $('<tbody></tbody>');
          data.forEach(function (row) {
            var $r = $('<tr></tr>');
            columns.forEach(function (col) {
              $r.append($('<td></td>').text(row[col] == null ? '' : row[col]));
            });
            $tbody.append($r);
          });
          $table.append($tbody);

          $('#metadata_container').empty().append($table);

          // initialize DataTables if available
          if ($.fn.dataTable) {
            if ($.fn.dataTable.isDataTable('#metadata_table')) {
              $('#metadata_table').DataTable().destroy();
            }
            $('#metadata_table').DataTable({ pageLength: 10, responsive: true });
          }
        },
        error: function (err) {
          $('#metadata_container').html('<p>Error parsing metadata: ' + String(err) + '</p>');
        }
      });
    })
    .catch(function (err) {
      console.error('Metadata fetch error for', metadataUrl, err);
      $('#metadata_container').html('<p>Error loading metadata at <code>' + metadataUrl + '</code>: ' + String(err) + '</p>');
    });
}

// Dataset selectors
(function () {
  function populate() {
    var recs = window.databaseRecords || [];
    if (!recs.length) return false;
    var seen = new Set();
    var $sel = $('#dataset_select');
    $sel.find('option:not([value=""])').remove();
    recs.forEach(function (r) {
      var name = r.Data_Name || '';
      if (name && !seen.has(name)) {
        $sel.append($('<option>').val(name).text(name));
        seen.add(name);
      }
    });
    return true;
  }

  $(function () {
    // Try immediately; if not ready, try again in a few secs (max ~5s)
    if (!populate()) {
      var tries = 0;
      var maxTries = 50;
      var t = setInterval(function () {
        if (populate() || ++tries >= maxTries) clearInterval(t);
      }, 100);
    }

    $('#show_metadata_btn').on('click', function () {
      var ds = $('#dataset_select').val();
      if (!ds) { alert('Please select a dataset'); return; }
      if (typeof showMetadataTable === 'function') {
        showMetadataTable(ds);
      } else {
        alert('Metadata helper not loaded yet.');
      }
    });
  });
})();