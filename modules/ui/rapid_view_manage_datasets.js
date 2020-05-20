import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select } from 'd3-selection';

import { t, textDirection } from '../util/locale';
import { geoExtent } from '../geo';
import { services } from '../services';
import { svgIcon } from '../svg/icon';
import { utilKeybinding, utilRebind } from '../util';


export function uiRapidViewManageDatasets(context, parentModal) {
  const RAPID_MAGENTA = '#ff26d4';
  const rapidContext = context.rapidContext();
  const dispatch = d3_dispatch('done');

  let _content = d3_select(null);
  let _datasetInfo;


  function render() {
    // Unfortunately `uiModal` is written in a way that there can be only one at a time.
    // So we have to roll our own modal here instead of just creating a second `uiModal`.
    let shaded = context.container().selectAll('.shaded');  // container for the existing modal
    if (shaded.empty()) return;
    if (shaded.selectAll('.modal-view-manage').size()) return;  // view/manage modal exists already

    const origClose = parentModal.close;
    parentModal.close = () => { /* ignore */ };

    let myClose = () => {
      myModal
        .transition()
        .duration(200)
        .style('top','0px')
        .remove();

      parentModal.close = origClose;  // restore close handler

      let keybinding = utilKeybinding('modal');
      keybinding.on(['⌫', '⎋'], origClose);
      d3_select(document).call(keybinding);
      dispatch.call('done');
    };

    let keybinding = utilKeybinding('modal');
    keybinding.on(['⌫', '⎋'], myClose);
    d3_select(document).call(keybinding);

    let myModal = shaded
      .append('div')
      .attr('class', 'modal modal-splash modal-rapid modal-view-manage fillL')
      .style('opacity', 0);

    myModal
      .append('button')
      .attr('class', 'close')
      .on('click', myClose)
      .call(svgIcon('#iD-icon-close'));

    _content = myModal
      .append('div')
      .attr('class', 'content rapid-stack fillL');

    _content
      .call(renderModalContent);

    myModal
      .transition()
      .style('opacity', 1);
  }


  function renderModalContent(selection) {
    /* Header section */
    let headerEnter = selection.selectAll('.rapid-view-manage-header')
      .data([0])
      .enter()
      .append('div')
      .attr('class', 'modal-section rapid-view-manage-header');

    headerEnter
      .append('div')
      .attr('class', 'rapid-view-manage-header-icon')
      .call(svgIcon('#iD-icon-data', 'icon-30'));

    headerEnter
      .append('div')
      .attr('class', 'rapid-view-manage-header-text')
      .text('ArcGIS Datasets');

    headerEnter
      .append('div')
      .attr('class', 'rapid-view-manage-header-inputs')
      .text('Home / Search');


    /* Dataset section */
    let dsSection = selection.selectAll('.rapid-view-manage-datasets')
      .data([0]);

    // enter
    let dsSectionEnter = dsSection.enter()
      .append('div')
      .attr('class', 'modal-section rapid-view-manage-datasets');

    // update
    dsSection
      .merge(dsSectionEnter)
      .call(renderDatasets);
  }


  function renderDatasets(selection) {
    const service = services.esriData;
    if (!service || (Array.isArray(_datasetInfo) && !_datasetInfo.length)) {
      selection.text('No datasets available.');
      return;
    }

    if (!_datasetInfo) {
      selection.text('Fetching available datasets...');
      service.loadDatasets()
        .then(results => _datasetInfo = Object.values(results))
        .then(() => selection.text('').call(renderDatasets));
      return;
    }

    let datasets = selection.selectAll('.rapid-view-manage-dataset')
      .data(_datasetInfo, d => d.id);

    // enter
    let datasetsEnter = datasets.enter()
      .append('div')
      .attr('class', 'rapid-view-manage-dataset');

    let labelsEnter = datasetsEnter
      .append('div')
      .attr('class', 'rapid-view-manage-dataset-label');

    labelsEnter
      .append('strong')
      .text(d => d.title);

    labelsEnter
      .append('div')
      .text(d => d.snippet);

    labelsEnter
      .append('button')
      .attr('class', 'rapid-view-manage-dataset-action')
      .on('click', toggleDataset);

    let thumbsEnter = datasetsEnter
      .append('div')
      .attr('class', 'rapid-view-manage-dataset-thumb');

    thumbsEnter
      .append('img')
      .attr('class', 'rapid-view-manage-dataset-thumbnail')
      .attr('src', d => `https://openstreetmap.maps.arcgis.com/sharing/rest/content/items/${d.id}/info/${d.thumbnail}?w=400`);

    // update
    datasets = datasets
      .merge(datasetsEnter);

    datasets.selectAll('.rapid-view-manage-dataset-action')
      .classed('secondary', d => datasetAdded(d))
      .text(d => datasetAdded(d) ? 'Remove' : 'Add to Map');
  }


  function toggleDataset(d, i, nodes) {
    const datasets = rapidContext.datasets();

    if (datasets[d.id]) {
      delete datasets[d.id];

    } else {
      let dataset = {
        key: d.id,
        enabled: true,
        service: 'esri',
        color: RAPID_MAGENTA,
        label: d.title
        // description:       make it fit?
        // license_markdown:  linkify?
      };

      if (d.extent) {
        dataset.extent = geoExtent(d.extent);
      }

      datasets[d.id] = dataset;
    }
    nodes[i].blur();
    _content.call(renderModalContent);
  }


  function datasetAdded(d) {
    return !!rapidContext.datasets()[d.id];
  }


  return utilRebind(render, dispatch, 'on');
}