from pyspark.sql.functions import col, lit, format_string
from pyspark.sql.column import Column

from r2r import Mapping

EXAMPLE_NS = "http://example.com/factory"


def component_iri(component_id_column_name) -> Column:
    return format_string(f"{EXAMPLE_NS}/component-%s", component_id_column_name)


def type_iri(type_name) -> Column:
    return lit(f"{EXAMPLE_NS}/type/{type_name}")


def predicate_iri(predicate_name) -> str:
    return f"{EXAMPLE_NS}/pred/{predicate_name}"


mappings = {
    spark.conf.get("triple_table"): Mapping(
        source=spark.conf.get("bronze_table"),
        subject_map=component_iri("component_id"),
        rdf_type=type_iri("component"),
        predicate_object_maps={
            predicate_iri("sensor_rotation"): col("sensor_rotation"),
            predicate_iri("sensor_flow"): col("sensor_flow"),
            predicate_iri("sensor_temperature"): col("sensor_temperature"),
            predicate_iri("sensor_speed"): col("sensor_speed"),
            predicate_iri("sensor_vibration"): col("sensor_vibration"),
            predicate_iri("sensor_pressure"): col("sensor_pressure"),
            predicate_iri("component_yield_output"): col("component_yield_output"),
            predicate_iri("damaged_component"): col("damaged_component").cast("string"),
            predicate_iri("abnormal_sensor"): col("abnormal_sensor"),
        },
        metadata_columns={
            "timestamp": col("timestamp").cast("timestamp"),
        },
    ),
}

for name, mapping in mappings.items():
    mapping.to_dp(spark, name)
