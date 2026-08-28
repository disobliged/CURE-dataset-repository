// This script searches the Project_Database.csv to find matching projects.
// It's currently set up to search specific columns, but can be modified to search other columns as needed.
// If you want to add more, just Ctrl+F for one of the default options (ex. Data_Accession) and then copy those lines for whatever column you want.

(function () {

  // VERY IMPORTANT THAT THIS FILE PATH IS ACCURATE
  // database_location: the path to the project repo CSV file (relative to the top of the Github repo)
  var config = {
    database_location: 'Project_Database.csv',
  };

  window.databaseRecords = [];

  // Load PapaParse, then parse the CSV
  function loadPapaAndParse() {
    if (window.Papa) return parseCsv();
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
    s.onload = parseCsv;
    document.head.appendChild(s);
  }

  // This loads the main database CSV file (config.database_location) and stores it in window.databaseRecords.
  function parseCsv() {
    Papa.parse(config.database_location, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function (res) {
        window.databaseRecords = (res.data || []).map(function (r) {
          var out = {};
          Object.keys(r).forEach(function (k) { out[k && k.trim()] = r[k]; });
          return out;
        });
      }
    });
  }

  // This function searches the database records for matches to the search term.
  // You can add more search terms if you want - just follow the style shown below, and make sure it matches the project repo csv.
  function searchProjects(term, searchParam) {
    if (!term) return [];
    var q = String(term).trim().toLowerCase(); // q is the person's search query
    if (!q) return [];
    var recs = window.databaseRecords || [];
    
    // removes undefined or null values and converts to lowercase for comparison
    function get(r, f) { return (r[f] || '').toString().toLowerCase(); }

    // Then we filter the CSV to only include records with matching text.
    return recs.filter(function (r) {
      if (!searchParam || searchParam === 'all') {
        return get(r, 'Paper_DOI').includes(q) ||
               get(r, 'Paper_Title').includes(q) ||
               get(r, 'Data_Accession').includes(q) ||
               get(r, 'Data_Name').includes(q);
      }
      switch (searchParam) {
        case 'doi': return get(r, 'Paper_DOI').includes(q);
        case 'data_accession': return get(r, 'Data_Accession').includes(q);
        case 'dataset_name': return get(r, 'Data_Name').includes(q);
        case 'paper_title': return get(r, 'Paper_Title').includes(q);
        default:
          return get(r, 'Paper_DOI').includes(q) ||
                 get(r, 'Paper_Title').includes(q) ||
                 get(r, 'Data_Accession').includes(q) ||
                 get(r, 'Data_Name').includes(q);
      }
    });
  }

  // This function renders the search results to the page - helpful if you want to actually see the results!
  // It also formats the results so that it's not just a big blob of text.
  function renderResults(results, term) {
    var $out = $('#search_results');
    if ($out.length === 0) {
      $out = $('<div id="search_results"></div>');
      $('.content').append($out);
    }
    $out.empty();

    if (!results || results.length === 0) {
      $out.text('No matching projects or datasets found.');
      return;
    }

    $out.append($('<h3></h3>').text("Search Results for '" + term + "':"));

    // Group results strictly by normalized Data_Accession
    var groups = {};
    results.forEach(function (r) {
      var raw = (r['Data_Accession'] || '').toString();
      var acc = raw.trim().toLowerCase();
      var key = acc || '__no_accession__';
      (groups[key] = groups[key] || []).push(r);
    });

    // Debugging: show totals in console to confirm grouping behavior
    Object.keys(groups).forEach(function(k){ console.log(' group', k, 'count', groups[k].length); });

    var $container = $('<div class="search-groups"></div>');
    Object.keys(groups).forEach(function (key) {
      var grp = groups[key];
      var first = grp[0] || {};
      var accession = first['Data_Accession'] || '';
      var dname = first['Data_Name'] || '';
      var metadata = first['Data_Metadata'] || '';

      // Header is created once per group (per accession)
      var $group = $('<div class="result-group"></div>');
      var $header = $('<div class="group-header" style="font-size: 1.2em;"></div>');
      $header.append($('<strong></strong>').text('Dataset Accession: '))
            .append(document.createTextNode(accession || '(no accession)'))
            .append(document.createTextNode('  '))
            .append($('<strong></strong>').text('Dataset Name: '))
            .append(document.createTextNode(dname || '(no name)'))
            .append(document.createTextNode('  '));
      if (metadata) {
        $header.append($('<a style="color:rgb(154, 189, 245);"></a>').attr('href', ('../' + metadata)).attr('target','_blank').text('Download metadata'));
      }
      $group.append('<br>').append($header).append('<br>');

      // Papers list inside the group
      var $papers = $('<ol class="group-papers" style="font-size: 1em;"></ol>');
      grp.forEach(function (r) {
        var ptitle = r['Paper_Title'] || '';
        var pyear = r['Paper_Year'] || '';
        var ptype = r['Paper_Type'] || '';
        var plink = r['Paper_Link'] || '';
        var doi = r['Paper_DOI'] || '';

        var $li = $('<li></li>');
        var titleText = ptitle || doi || 'Untitled';
        var $titleElem;

        // create title element (link if possible, otherwise plain span)
        if (plink) {
          $titleElem = $('<a></a>')
            .attr({ href: plink, target: '_blank', rel: 'noopener noreferrer' })
            .text(titleText);
        } else if (doi) {
          var doiUrl = (/^https?:\/\//i).test(doi) ? doi : ('https://doi.org/' + doi);
          $titleElem = $('<a style="color:rgb(111, 163, 248);"></a>')
            .attr({ href: doiUrl, target: '_blank', rel: 'noopener noreferrer' })
            .text(titleText);
        } else {
          $titleElem = $('<span></span>').text(titleText);
        }

        $li.append($titleElem);

        // append year and type as inline text immediately after the title
        var metaParts = [];
        if (pyear) metaParts.push(String(pyear));
        if (ptype) metaParts.push(String(ptype));
        if (metaParts.length) {
          // append a small inline span for the metadata so it stays on the same line
          $li.append(' ').append(
            $('<span class="paper-meta"></span>').text('\u2014 ' + metaParts.join(' | '))
          );
        }

        $papers.append($li);
      });

      $group.append($papers);
      $container.append($group);
    });

    $out.append($container);
  }
  // Two ways to run the search: press Search or Enter.

  // This runs the search function when the user clicks the search button.
  window.do_onclick = function () {
    var term = ($('#search_bar').val() || '').toString().trim();
    var param = $('#search_param').val() || '';
    var results = searchProjects(term, param);
    renderResults(results, term);
  };

  // This runs the search function when the user presses the Enter key in the search bar.
  $(function () {
    $('#search_bar').on('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#do').trigger('click');
      }
    });
    loadPapaAndParse();
  });

})();
