<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import { ref,onMounted, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';
import MenuBar from '../components/MenuBar.vue';
import RDFInput from '@/components/RDFInput.vue';
const router = useRouter();

const twinName = ref(''); // two-way binding for name field
const twinBody = useTemplateRef('rdfcode')

const cancelTwinCreation = () => {
    router.push('/');
};

const createDigitalTwin = async () => {
    console.log(twinName.value)
    console.log(twinBody.value.getCodemirrorCode())
    console.log("Creating Digital Twin:", twinName.value);
    
    if(twinName.value?.length == 0 || twinBody.value.getCodemirrorCode().length == 0){
      return; 
    }

    

    try {
         const payload = {
        name: twinName.value,
        body: twinBody.value.getCodemirrorCode(),
        };

        const response = await fetch(`${import.meta.env.VITE_APP_HOST}/api/digital-twins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle HTTP errors (e.g., show error toast)
            console.error(result.error);
            return;
        }

        // Success: navigate or update UI as needed
        console.log('Digital twin created:', result);
        router.push('/'); // Or to twins listing/details
    } catch (err) {
        // Handle network or other errors
        console.error('Failed to create digital twin:', err);
    }

};



</script>

<template>
  <MenuBar/>
  <div class="flex justify-center mt-36">
    <Card class="w-full max-w-3xl shadow-lg">
      <template #title>
        Create Digital Twin
      </template>

      <template #content>
        <div class="flex flex-col gap-4">
          <div>
            <label for="twinName" class="font-semibold mb-2 block">Name</label>
            <InputText 
              id="twinName" 
              v-model="twinName" 
              placeholder="Enter twin name" 
              class="w-full" 
            />
          </div>
            <RDFInput ref="rdfcode"/>

        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button label="Cancel" severity="secondary" @click="cancelTwinCreation" />
          <Button label="Create" @click="createDigitalTwin" />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
/* Add any custom styling overrides if needed */
</style>
