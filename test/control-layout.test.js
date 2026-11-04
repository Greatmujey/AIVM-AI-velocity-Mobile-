import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeLayout,loadLayout,saveLayout} from '../src/control-layout.js';
test('control layouts are stored separately by orientation and reject bad positions',()=>{
 const data={portrait:{'fire-btn':{x:.8,y:.7},'aim-btn':{x:-1,y:8},unknown:{x:.5,y:.5}},landscape:{'fire-btn':{x:.9,y:.8}}};
 const clean=sanitizeLayout(data);assert.deepEqual(clean.portrait,{'fire-btn':{x:.8,y:.7}});assert.deepEqual(clean.landscape,{'fire-btn':{x:.9,y:.8}});
 let value;const storage={getItem(){return value},setItem(k,v){value=v}};saveLayout(storage,data);assert.deepEqual(loadLayout(storage),clean);
 assert.deepEqual(loadLayout({getItem(){throw Error('blocked')}}),{portrait:{},landscape:{}});
});
