

# COMMAND ----------

from mandrova.data_generator import SensorDataGenerator as sdg
import numpy as np
import pandas as pd
import random
import time
from datetime import datetime, timedelta
import uuid

# COMMAND ----------

def generate_equipment_mapping(num_lines, machines_per_line, num_components, num_sensors = 6):

    equipment_mapping = {"lines": []}
    for line_id in range(1, num_lines + 1):
        line = {
            "line_id": str(line_id),
            "line_name": f"Line {line_id}",
            "machines": []
        }
        for machine_index in range(machines_per_line[line_id - 1]):
            machine_id = f"{line_id}{machine_index + 1}"
            machine = {
                "machine_id": machine_id,
                "machine_name": f"Machine {machine_id}",
                "components": []
            }
            for component_index in range(num_components):
                component_id = f"{machine_id}{component_index + 1}"
                component = {
                    "component_id": component_id,
                    "sensors": []
                }
                for sensor_index in range(num_sensors):
                    sensor_id = f"{component_id}{sensor_index + 1}"
                    component["sensors"].append(sensor_id)
                machine["components"].append(component)
            line["machines"].append(machine)

        equipment_mapping["lines"].append(line)
    
    #add sensors config
    sensors_config = [{"name": "temperature", "sin_step": 0, "sigma": 1},
           {"name": "pressure", "sin_step": 0, "sigma": 2},
           {"name": "vibration", "sin_step": 0, "sigma": 3},
           {"name": "speed", "sin_step": 0.1, "sigma": 1.5},
           {"name": "rotation", "sin_step": 0.01, "sigma": 2},
           {"name": "flow", "sin_step": 0.2, "sigma": 1}]
    
    equipment_mapping["sensors_config"] = sensors_config

    return equipment_mapping

# COMMAND ----------


def table_size_estimator(machines_per_line, num_components, sample_size):
  
  # total size
  tot_num_rows = sum(machines_per_line) * num_components * sample_size
  est_table_size = float(tot_num_rows * 462 / (1024 ** 2))  # each row ~ 462 bytes --> MB

  # per line
  line_num_rows = []
  est_line_table_size = []

  for line in range(len(machines_per_line)):
    rows = machines_per_line[line] * num_components * sample_size
    size = float(rows * 462 / (1024 ** 2)) 
    line_num_rows.append(rows)
    est_line_table_size.append(size) 

  return tot_num_rows, est_table_size, line_num_rows, est_line_table_size

    

def generate_sensor_data(component_id, sensor_conf, faulty = False, sample_size = 1000, display_graph = False, noise = 2, delta = -3):
  ''' Generate data for a single sensor'''

  dg = sdg()
  rd = random.Random()
  rd.seed(component_id)
  dg.seed(component_id)
  sigma = sensor_conf['sigma']
  #Faulty, change the sigma with random value
  if faulty:
    sigma *= rd.randint(8,20)/10
    
  dg.generation_input.add_option(sensor_names="normal", distribution="normal", mu=0, sigma = sigma)
  dg.generation_input.add_option(sensor_names="sin", eq=f"2*exp(sin(t))+{delta}", initial={"t":0}, step={"t":sensor_conf['sin_step']})
  dg.generate(sample_size)
  sensor_name = "sensor_"+ sensor_conf['name']
  dg.sum(sensors=["normal", "sin"], save_to=sensor_name)
  max_value = dg.data[sensor_name].max()
  min_value = dg.data[sensor_name].min()
  if faulty:
    n_outliers = int(sample_size*0.15)
    outliers = np.random.uniform(-max_value*rd.randint(2,3), max_value*rd.randint(2,3), n_outliers)
    indicies = np.sort(np.random.randint(0, sample_size-1, n_outliers))
    dg.inject(value=outliers, sensor=sensor_name, index=indicies)

  n_outliers = int(sample_size*0.01)
  outliers = np.random.uniform(min_value*noise, max_value*noise, n_outliers)
  indicies = np.sort(np.random.randint(0, sample_size-1, n_outliers))
  dg.inject(value=outliers, sensor=sensor_name, index=indicies)
  
  if display_graph:
    dg.plot_data(sensors=[sensor_name])
  return dg.data[sensor_name]

# COMMAND ----------

def generate_component_data(component_number, component_id, component_count, sensors_config, sample_size, current_time, frequency_sec = 0.001):
  ''' Generate data for a single component '''
  
  component_id = int(component_id)
  rd = random.Random()
  rd.seed(component_id)

  #Generate sensor data
  damaged = component_number > component_count*0.6  #only 40% of the components are damaged
  df = pd.DataFrame()
  damaged_sensors = []
  rd.shuffle(sensors_config)

  for sensor in sensors_config:
    #30% change to have 1 sensor being damaged. Only 1 sensor (the first in the list) can send damaged metrics at a time to simplify the model. The other sensors won't be damaged for simplification

    if damaged and len(damaged_sensors) == 0 and sensor['name'] in sensors_config[0]['name']:
      damaged_sensor = rd.randint(1,10) > 5
    else:
      damaged_sensor = False

    if damaged_sensor:
      damaged_sensors.append('sensor_'+sensor['name'])

    plot = 0
    df['sensor_'+sensor['name']] = generate_sensor_data(component_id, sensor, damaged_sensor, sample_size)

  #Damaged component will produce less
  dg = sdg()
  factor = 50 if damaged else 30
  energy = dg.generation_input.add_option(sensor_names="energy", eq="x", initial={"x":0}, step={"x":np.absolute(np.random.randn(sample_size).cumsum()/factor)})
  dg.generate(sample_size, seed=rd.uniform(0,10000))
  df['component_yield_output'] = dg.data['energy']

  # Generate timestamps based on frequency value
  timestamps = [current_time + i * frequency_sec for i in range(sample_size)]
  formatted_timestamps = [
    datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    for ts in timestamps]
  df['timestamp'] = formatted_timestamps

  # Add other info
  df['component_id'] = str(component_id)
  df['damaged_component'] = damaged
  df['abnormal_sensor'] = "None" if len(damaged_sensors) == 0 else damaged_sensors[0]  #only the first sensor is tracked 

  return df

# COMMAND ----------

def generate_machine(line_number, machine_number, equipment_mapping, sample_size, current_time, frequency_sec = 0.001):
  ''' Generate data for a single machine'''

  df_machine = pd.DataFrame()
  component_count = len(equipment_mapping["lines"][line_number]["machines"][machine_number]["components"])

  for component_number in range(component_count):
    
    component_id = equipment_mapping["lines"][line_number]["machines"][machine_number]["components"][component_number]['component_id']

    df_component = generate_component_data(component_number, component_id, component_count, equipment_mapping["sensors_config"], sample_size, current_time)
    df_machine = pd.concat([df_machine, df_component], ignore_index=True)
  

  ## add machine id
  machine_id = equipment_mapping["lines"][line_number]["machines"][machine_number]["machine_id"]
  rd = random.Random()
  rd.seed(int(machine_id))
  df_machine["machine_id"] = str(uuid.UUID(int=rd.getrandbits(128)))
    
  return df_machine


# COMMAND ----------

def generate_line(line_number, equipment_mapping, sample_size, current_time, frequency_sec = 0.001):
  ''' Generate data for a single production line'''

  df_line = pd.DataFrame()
  machine_count = len(equipment_mapping["lines"][line_number]["machines"])

  for machine_number in range(machine_count) :
      
        df_machine=generate_machine(line_number, machine_number, equipment_mapping, sample_size, current_time)

        df_line = pd.concat([df_line, df_machine], ignore_index=True)
  
  # add line id 
  line_id = int(equipment_mapping["lines"][line_number]["line_id"])
  rd = random.Random()
  rd.seed(line_id)
  df_line["line_id"] = str(uuid.UUID(int=rd.getrandbits(128))) 

  return df_line

# COMMAND ----------

def generate_all_lines(equipment_mapping, sample_size, current_time, frequency_sec = 0.001):
  ''' Generate data for all production lines'''

  line_count = len(equipment_mapping["lines"])
  df_lines = pd.DataFrame()

  for line_number in range(line_count):
    
    df_line = generate_line(line_number, equipment_mapping, sample_size, current_time, frequency_sec)
    df_lines = pd.concat([df_lines, df_line], ignore_index=True) 
  
  return df_lines