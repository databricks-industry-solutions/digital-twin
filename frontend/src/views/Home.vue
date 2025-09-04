<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';
import MenuBar from '../components/MenuBar.vue';
import { ref, onMounted } from 'vue';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';

const router = useRouter();

const digitalTwins = ref([]);
const selectedTwins = ref([]);
const confirm = useConfirm();


const columns = [
  { field: 'name', header: 'Name' },
  { field: 'creator', header: 'Creator' },
  { field: 'timestamp', header: 'Timestamp' }
];

const handleRowClick = (event) => {
  if (
    !event.originalEvent.target.classList.contains('p-checkbox-box') &&
    !event.originalEvent.target.classList.contains('p-checkbox')
  ) {
    router.push(`/explore/${event.data.name}`);
  }
};

const createDigitalTwin = () => {
  router.push('/create');
};

// show a confirmation before delete
const confirmDelete = () => {
  confirm.require({
    message: `Are you sure you want to delete the selected digital twin(s)?`,
    header: 'Confirm Deletion',
    icon: '',
    acceptLabel: 'Yes',
    rejectLabel: 'No',
    accept: async () => {
      await deleteDigitalTwins();
    },
    reject: () => {
      // Do nothing or show cancellation feedback
    }
  });
};

const deleteDigitalTwins = async () => {
  if (!selectedTwins.value.length) return;
  for (const twin of selectedTwins.value) {
    try {
      await fetch(`${import.meta.env.VITE_APP_HOST}/api/digital-twins/${encodeURIComponent(twin.name)}`, { method: 'DELETE' });
    } catch {}
  }
  digitalTwins.value = digitalTwins.value.filter(
    twin => !selectedTwins.value.some(sel => sel.name === twin.name)
  );
  selectedTwins.value = [];
};

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_APP_HOST}/api/digital-twins`);
    const data = await response.json();
    digitalTwins.value = data.map(twin => ({
      name: twin.name,
      creator: twin.creator,
      timestamp: twin.created_at
    }));
  } catch {
    digitalTwins.value = [];
  }
});
</script>

<template>
<ConfirmDialog />
<MenuBar :showTimestamp="false"/>
<div class="flex justify-end gap-2">
  <Button label="Create new digital twin" class="mt-4 mx-2" @click="createDigitalTwin" />
  <Button 
    label="Delete selected"
    class="mt-4 mx-2"
    severity="danger"
    :disabled="!selectedTwins.length"
    @click="confirmDelete"
  />
</div>
<div class="mx-4">
  <DataTable
    :value="digitalTwins"
    tableStyle="min-width: 50rem"
    v-model:selection="selectedTwins"
    dataKey="name"
    selectionMode="multiple"
    @rowClick="handleRowClick"
  >
    <Column selectionMode="multiple" style="width: 3em" />
    <Column v-for="col of columns" :key="col.field" :field="col.field" :header="col.header" />
  </DataTable>
</div>
</template>

<style>

.p-datatable .p-datatable-tbody > tr:hover > td {
  background-color: #dcf1ff !important; /* Your desired hover color */
  color: #000;  /* Optional: text color */
  cursor: pointer; 
}

</style>
