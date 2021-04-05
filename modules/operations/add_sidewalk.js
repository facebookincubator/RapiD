import { t } from '../core/localizer';
import { behaviorOperation } from '../behavior/operation';
import { actionCopyEntities } from '../actions/copy_entities';
import { utilTotalExtent } from '../util';
import { geoExtent, geoVecSubtract, geoPointInPolygon } from '../geo';
import { modeSelect } from '../modes/select';
import { actionChangeTags } from '../actions/index';
import { presetManager} from '../presets';
import { modeMove } from '../modes/move';

import { actionMove } from '../actions/move';

export function operationAddSidewalk(context, selectedIDs) {
    var _sidewalkLoc;
    // if sidewalk is created using a hotkey instead of mouse op select,
    // then the behavior changes slightly.
    let isHotkeyPressed = false;
    var _extent = utilTotalExtent(selectedIDs, context.graph());

    function getFilteredIdsToCopy() {
        return selectedIDs.filter(selectedID => {
            var entity = context.graph().hasEntity(selectedID);
            return entity.type === 'way';
        });
    }

    function setTags(entity) {
        const preset = presetManager.item('highway/footway/sidewalk');
        var entityID = entity.id;
        var geometry = entity.geometry(context.graph());

        var oldPreset = presetManager.match(context.graph().entity(entityID), context.graph());
        var tags = {};
        if (oldPreset) tags = oldPreset.unsetTags(tags, geometry);
        if(entity.type === 'way' && preset) {
            var nameTag = entity.tags.name ? {name: entity.tags.name} : {};
            tags = preset.setTags(nameTag, geometry, false);
        }
        context.perform(actionChangeTags(entityID, tags));
    }

    var operation = function() {
        if (!_sidewalkLoc) {
            isHotkeyPressed = true;
            // get mouse location. Sidewalk will be created there
            _sidewalkLoc = context.map().mouse();
            var projection = context.projection;
            var viewport = geoExtent(projection.clipExtent()).polygon();
            if (!geoPointInPolygon(_sidewalkLoc, viewport)) return;
        }

        // 1st copy the points
        var graph = context.graph();
        var oldIDs = getFilteredIdsToCopy();
        if (!oldIDs.length) return;

        var projection = context.projection;
        var extent = geoExtent();
        var oldGraph = context.graph();
        var newIDs = [];

        var action = actionCopyEntities(oldIDs, oldGraph);
        context.perform(action);

        var copies = action.copies();
        var originals = new Set();
        Object.values(copies).forEach(function(entity) { originals.add(entity.id); });

        for (var id in copies) {
            var oldEntity = oldGraph.entity(id);
            var newEntity = copies[id];

            extent._extend(oldEntity.extent(oldGraph));

            // Exclude child nodes from newIDs if their parent way was also copied.
            var parents = context.graph().parentWays(newEntity);
            var parentCopied = parents.some(function(parent) {
                return originals.has(parent.id);
            });

            setTags(newEntity);
            if (!parentCopied) {
                newIDs.push(newEntity.id);
            }
        }

        // Use the location of the copy operation to offset the paste location,
        // or else use the center of the pasted extent
        var copyPoint = (context.copyLonLat() && projection(context.copyLonLat())) ||
            projection(extent.center());
        var delta = geoVecSubtract(_sidewalkLoc, copyPoint);



        // Move the pasted objects to be anchored at the paste location
        context.replace(actionMove(newIDs, delta, projection), operation.annotation());
        if(isHotkeyPressed) {
            // 'stick' the sidwalk to mouse pointer, which makes it easier to move.
            context.enter(modeMove(context, newIDs, graph));
        } else {
            context.enter(modeSelect(context, newIDs));
        }
    };

    operation.point = function(val) {
        _sidewalkLoc = val;
        return operation;
    };


    operation.available = function() {
        return getFilteredIdsToCopy().length;
    };


    // don't cache this because the visible extent could change
    operation.disabled = function() {
        if (!getFilteredIdsToCopy().length) return 'not_selected';
        if (_extent.percentContainedIn(context.map().extent()) < 0.8) {
            return 'too_large';
        }
    };


    operation.tooltip = function() {
        var disable = operation.disabled();
        return disable ?
            t('operations.add_sidewalk.' + disable) :
            t('operations.add_sidewalk.description');
    };


    operation.annotation = function() {
        return t('operations.add_sidewalk.annotation');
    };


    operation.id = 'add_sidewalk';
    operation.keys = ['⇧' + t('operations.add_sidewalk.key')];
    operation.title = t('operations.add_sidewalk.title');
    operation.behavior = behaviorOperation(context).which(operation);

    return operation;
}
