<script setup>
import Menubar from 'primevue/menubar';
import DatePicker from 'primevue/datepicker';
import { ref, watch } from "vue";

const props = defineProps({
  showTimestamp: {
    type: Boolean,
    default: false, 
  }
})

const timestamp = ref(null)
  const emit = defineEmits(['timestampSelected'])

const getTimestamp = () => {
  return new Date(timestamp.value).toISOString()
}

watch(timestamp, (newTimestamp) => {
  emit('timestampSelected',{timestamp: getTimestamp() })
})


const items = ref([
    /*   
{
        label: 'Home',
        icon: '', 
        route: '/'
    },

    

    {
        label: 'Simulate',
        icon: 'pi pi-star'
    },
    */ 
]);



</script>


<template>

<Menubar :model="items">
          <template #start>
  <img src="/databricks.svg" class="h-6" /> 
  </template>
    <template #item="{ item, props, hasSubmenu }" >
   
        <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
            <a v-ripple :href="href" v-bind="props.action" @click="navigate">
                <span :class="item.icon" />
                <span>{{ item.label }}</span>
            </a>
        </router-link>
        <a v-else v-ripple :href="item.url" :target="item.target" v-bind="props.action">
            <span :class="item.icon" />
            <span>{{ item.label }}</span>
            <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down" />
        </a>
    </template>

      <template #end>
<DatePicker v-if="showTimestamp"  id="datepicker-24h" v-model="timestamp" showTime hourFormat="24" fluid placeholder="Timestamp"/>
  </template>

</Menubar>



    




</template>

<style scoped></style>