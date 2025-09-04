<script setup>
import { useTemplateRef, onMounted, onBeforeMount} from 'vue'
import { useRoute } from 'vue-router'
import cytoscape from 'cytoscape';
import MenuBar from '../components/MenuBar.vue';
import { ref } from "vue";
import Sidebar from 'primevue/sidebar';
import {  parseDigitalTwinStructure, parseDigitalTwinState,retrieveAffectedQuads } from '@/utils/rdf';
import { fetchLatestTriples,fetchTriplesAtTimestamp } from '@/utils/triples';
import { fetchDigitalTwinRDFBody,getDigitalTwinLayoutAndStyle } from '@/utils/digitaltwin';

import { Store } from 'n3'
import { QueryEngine } from '@comunica/query-sparql-rdfjs';

const route = useRoute()

const graph = useTemplateRef('graph')
const visibleRight = ref(false)
const visibleComponent = ref({
    id: 0,
    label: null, 
    type: null, 
    sensorList: {}
})

const digitalTwinState = ref({})
const digitalTwinStructure = ref([])
const engine = new QueryEngine();
/*
On state update: 
1. Determine broken elements 
2. Update N3 quads with broken elements (see if store can be updated?) X 
3. Load quads into store. X 
4. Execute SPARQL query to determine impact X 
5. Traverse returned quads and set state to impacted X 
6. Redraw cytoscape graph (prefer inplace mutation not full redraw)
*/

const handleTimestampSelection = async (event) => {
  digitalTwinState.value = await parseDigitalTwinState(await fetchTriplesAtTimestamp(event.timestamp))
  
 
}



onMounted(async () => {



digitalTwinStructure.value = await parseDigitalTwinStructure(await fetchDigitalTwinRDFBody(route.params.name))  //
digitalTwinState.value = await parseDigitalTwinState(await fetchLatestTriples())
let results = digitalTwinStructure.value 

  //update results state
  //important also need to extend the quads array (core quads + state relations)
  for(let result of results.elements){
 
    if( digitalTwinState.value[result.data.id] != undefined){
      if('damaged_component' in digitalTwinState.value[result.data.id] ){
      if(digitalTwinState.value[result.data.id]['damaged_component'] == 'true'){
      result.data.state = 'broken'
      }
      }


    }
  }


  const store = new Store();
  store.addQuads(results.quads);
  const affectedQuads = await retrieveAffectedQuads(engine,store)
  
  //TODO improve efficiency no double for loop needed simply store location of quad
  for(let quad of affectedQuads){
    for(let i = 0; i < results.elements.length; i++){
       if(results.elements[i].data.id == quad.subject.id){
      
        results.elements[i].data.state = 'impacted'
        break 
      }
    }
  }

const [layout, style]  = getDigitalTwinLayoutAndStyle(results)

let cy = cytoscape({
  container: graph.value, 
  elements: results.elements,
  style: style,
  layout: layout,
});

cy.on('tap', 'node', function(evt){
  var node = evt.target;
  visibleRight.value = true; 

  visibleComponent.value.label = node.data('label');
  visibleComponent.value.type = node.data('type'); 
  visibleComponent.value.comment = node.data('comment')
  // Pick a random value from the digitalTwinState object

  visibleComponent.value.sensorList = digitalTwinState.value[node.data('id')] ?? [] 
 
});

})



</script>

<template>
<MenuBar :show-timestamp="true" @timestamp-selected="handleTimestampSelection"/>


 <div ref="graph" class="graph-container"></div> 
<Sidebar v-model:visible="visibleRight"  position="right" class="" style="width: 25rem !important;">
  
      <template #header>
        <div class="flex align-items-center gap-2">
        
            <span class="font-bold text-lg">{{visibleComponent.label}}</span>
        </div>
    </template>
  <span class="text-gray-600 ">{{ visibleComponent.type }} </span>
    <span class="text-gray-600 ">{{ visibleComponent.comment }} </span>
    <ul class="space-y-3 mt-3">

      <li v-for="sensor in Object.keys(visibleComponent.sensorList)" :key="sensor" class="flex  justify-between">
        <span class="font-semibold text-gray-800">{{ sensor}}</span>
        <span class="text-gray-600">{{ visibleComponent.sensorList[sensor] }} </span>
      </li>
    </ul>
  
</Sidebar>


</template>

<style scoped>



.graph-container {
width: 100vw;
 height: calc(100vh - 80px);
margin: auto; 
background-color: rgb(246, 247, 249)

}

</style>
