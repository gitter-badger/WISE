'use strict';

import NavItem from './navItem/navItem';
import NavItemProgress from './navItemProgress/navItemProgress';
import NavItemScore from './navItemScore/navItemScore';
import WorkgroupsOnNode from './workgroupsOnNode/workgroupsOnNode';

let NodeProgress = angular.module('nodeProgress', []);

NodeProgress.component('navItem', NavItem);
NodeProgress.component('navItemProgress', NavItemProgress);
NodeProgress.component('navItemScore', NavItemScore);
NodeProgress.component('workgroupsOnNode', WorkgroupsOnNode);

export default NodeProgress;
