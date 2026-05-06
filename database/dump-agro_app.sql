--
-- PostgreSQL database dump
--

\restrict QkzerfBPSeupFUybkDGDYFFyZXtn3TfYx0CvaeWQKsVShjpfYbFdhCM5aNj6yjh

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-06 18:20:16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_transportador_id_foreign;
ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_tenant_id_foreign;
ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_extractora_id_foreign;
ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_empresa_transportadora_id_foreign;
ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_creado_por_foreign;
ALTER TABLE ONLY public.viaje_documento_bascula DROP CONSTRAINT viaje_documento_bascula_viaje_id_foreign;
ALTER TABLE ONLY public.viaje_documento_bascula DROP CONSTRAINT viaje_documento_bascula_tenant_id_foreign;
ALTER TABLE ONLY public.viaje_documento_bascula DROP CONSTRAINT viaje_documento_bascula_creado_por_foreign;
ALTER TABLE ONLY public.viaje_detalle DROP CONSTRAINT viaje_detalle_viaje_id_foreign;
ALTER TABLE ONLY public.viaje_detalle DROP CONSTRAINT viaje_detalle_tenant_id_foreign;
ALTER TABLE ONLY public.viaje_detalle DROP CONSTRAINT viaje_detalle_reconteo_aprobado_por_foreign;
ALTER TABLE ONLY public.viaje_detalle DROP CONSTRAINT viaje_detalle_cosecha_id_foreign;
ALTER TABLE ONLY public.vacaciones DROP CONSTRAINT vacaciones_tenant_id_foreign;
ALTER TABLE ONLY public.vacaciones DROP CONSTRAINT vacaciones_nomina_id_foreign;
ALTER TABLE ONLY public.vacaciones DROP CONSTRAINT vacaciones_empleado_id_foreign;
ALTER TABLE ONLY public.vacaciones DROP CONSTRAINT vacaciones_aprobado_por_foreign;
ALTER TABLE ONLY public.vacacion_acumulado DROP CONSTRAINT vacacion_acumulado_tenant_id_foreign;
ALTER TABLE ONLY public.vacacion_acumulado DROP CONSTRAINT vacacion_acumulado_empleado_id_foreign;
ALTER TABLE ONLY public.transportadores DROP CONSTRAINT transportadores_tenant_id_foreign;
ALTER TABLE ONLY public.transportadores DROP CONSTRAINT transportadores_empresa_transportadora_id_foreign;
ALTER TABLE ONLY public.tipos_hora_extra DROP CONSTRAINT tipos_hora_extra_tenant_id_foreign;
ALTER TABLE ONLY public.tenant_user DROP CONSTRAINT tenant_user_user_id_foreign;
ALTER TABLE ONLY public.tenant_user DROP CONSTRAINT tenant_user_tenant_id_foreign;
ALTER TABLE ONLY public.tenant_config DROP CONSTRAINT tenant_config_tenant_id_foreign;
ALTER TABLE ONLY public.telescope_entries_tags DROP CONSTRAINT telescope_entries_tags_entry_uuid_foreign;
ALTER TABLE ONLY public.sublotes DROP CONSTRAINT sublotes_tenant_id_foreign;
ALTER TABLE ONLY public.sublotes DROP CONSTRAINT sublotes_lote_id_foreign;
ALTER TABLE ONLY public.semillas DROP CONSTRAINT semillas_tenant_id_foreign;
ALTER TABLE ONLY public.semilla_lote DROP CONSTRAINT semilla_lote_tenant_id_foreign;
ALTER TABLE ONLY public.semilla_lote DROP CONSTRAINT semilla_lote_semilla_id_foreign;
ALTER TABLE ONLY public.semilla_lote DROP CONSTRAINT semilla_lote_lote_id_foreign;
ALTER TABLE ONLY public.role_has_permissions DROP CONSTRAINT role_has_permissions_role_id_foreign;
ALTER TABLE ONLY public.role_has_permissions DROP CONSTRAINT role_has_permissions_permission_id_foreign;
ALTER TABLE ONLY public.registro_cosecha DROP CONSTRAINT registro_cosecha_tenant_id_foreign;
ALTER TABLE ONLY public.registro_cosecha DROP CONSTRAINT registro_cosecha_sublote_id_foreign;
ALTER TABLE ONLY public.registro_cosecha DROP CONSTRAINT registro_cosecha_operacion_id_foreign;
ALTER TABLE ONLY public.registro_cosecha DROP CONSTRAINT registro_cosecha_lote_id_foreign;
ALTER TABLE ONLY public.promedio_lote DROP CONSTRAINT promedio_lote_tenant_id_foreign;
ALTER TABLE ONLY public.promedio_lote DROP CONSTRAINT promedio_lote_lote_id_foreign;
ALTER TABLE ONLY public.predios DROP CONSTRAINT predios_tenant_id_foreign;
ALTER TABLE ONLY public.precios_palma DROP CONSTRAINT precios_palma_tenant_id_foreign;
ALTER TABLE ONLY public.precio_cosecha DROP CONSTRAINT precio_cosecha_tenant_id_foreign;
ALTER TABLE ONLY public.precio_cosecha DROP CONSTRAINT precio_cosecha_lote_id_foreign;
ALTER TABLE ONLY public.precio_abono DROP CONSTRAINT precio_abono_tenant_id_foreign;
ALTER TABLE ONLY public.palmas DROP CONSTRAINT palmas_tenant_id_foreign;
ALTER TABLE ONLY public.palmas DROP CONSTRAINT palmas_sublote_id_foreign;
ALTER TABLE ONLY public.palmas DROP CONSTRAINT palmas_linea_id_foreign;
ALTER TABLE ONLY public.operaciones DROP CONSTRAINT operaciones_tenant_id_foreign;
ALTER TABLE ONLY public.operaciones DROP CONSTRAINT operaciones_creado_por_foreign;
ALTER TABLE ONLY public.operaciones DROP CONSTRAINT operaciones_aprobado_por_foreign;
ALTER TABLE ONLY public.nominas DROP CONSTRAINT nominas_tenant_id_foreign;
ALTER TABLE ONLY public.nominas DROP CONSTRAINT nominas_cerrada_por_foreign;
ALTER TABLE ONLY public.nomina_tabla_legal DROP CONSTRAINT nomina_tabla_legal_tenant_id_foreign;
ALTER TABLE ONLY public.nomina_tabla_legal DROP CONSTRAINT nomina_tabla_legal_concepto_id_foreign;
ALTER TABLE ONLY public.nomina_jornal_ref DROP CONSTRAINT nomina_jornal_ref_tenant_id_foreign;
ALTER TABLE ONLY public.nomina_jornal_ref DROP CONSTRAINT nomina_jornal_ref_nomina_empleado_id_foreign;
ALTER TABLE ONLY public.nomina_jornal_ref DROP CONSTRAINT nomina_jornal_ref_jornal_id_foreign;
ALTER TABLE ONLY public.nomina_hora_extra_ref DROP CONSTRAINT nomina_hora_extra_ref_tenant_id_foreign;
ALTER TABLE ONLY public.nomina_hora_extra_ref DROP CONSTRAINT nomina_hora_extra_ref_nomina_empleado_id_foreign;
ALTER TABLE ONLY public.nomina_hora_extra_ref DROP CONSTRAINT nomina_hora_extra_ref_hora_extra_id_foreign;
ALTER TABLE ONLY public.nomina_empleado DROP CONSTRAINT nomina_empleado_tenant_id_foreign;
ALTER TABLE ONLY public.nomina_empleado DROP CONSTRAINT nomina_empleado_nomina_id_foreign;
ALTER TABLE ONLY public.nomina_empleado DROP CONSTRAINT nomina_empleado_liquidado_por_foreign;
ALTER TABLE ONLY public.nomina_empleado DROP CONSTRAINT nomina_empleado_empleado_id_foreign;
ALTER TABLE ONLY public.nomina_empleado_concepto DROP CONSTRAINT nomina_empleado_concepto_tenant_id_foreign;
ALTER TABLE ONLY public.nomina_empleado_concepto DROP CONSTRAINT nomina_empleado_concepto_nomina_empleado_id_foreign;
ALTER TABLE ONLY public.nomina_empleado_concepto DROP CONSTRAINT nomina_empleado_concepto_concepto_id_foreign;
ALTER TABLE ONLY public.nomina_cosecha_ref DROP CONSTRAINT nomina_cosecha_ref_tenant_id_foreign;
ALTER TABLE ONLY public.nomina_cosecha_ref DROP CONSTRAINT nomina_cosecha_ref_nomina_empleado_id_foreign;
ALTER TABLE ONLY public.nomina_cosecha_ref DROP CONSTRAINT nomina_cosecha_ref_cosecha_cuadrilla_id_foreign;
ALTER TABLE ONLY public.nomina_concepto DROP CONSTRAINT nomina_concepto_tenant_id_foreign;
ALTER TABLE ONLY public.municipios DROP CONSTRAINT municipios_departamento_codigo_foreign;
ALTER TABLE ONLY public.motivos_ausencia DROP CONSTRAINT motivos_ausencia_tenant_id_foreign;
ALTER TABLE ONLY public.model_has_roles DROP CONSTRAINT model_has_roles_role_id_foreign;
ALTER TABLE ONLY public.model_has_permissions DROP CONSTRAINT model_has_permissions_permission_id_foreign;
ALTER TABLE ONLY public.modalidad_contrato DROP CONSTRAINT modalidad_contrato_tenant_id_foreign;
ALTER TABLE ONLY public.lotes DROP CONSTRAINT lotes_tenant_id_foreign;
ALTER TABLE ONLY public.lotes DROP CONSTRAINT lotes_predio_id_foreign;
ALTER TABLE ONLY public.liquidaciones DROP CONSTRAINT liquidaciones_tenant_id_foreign;
ALTER TABLE ONLY public.liquidaciones DROP CONSTRAINT liquidaciones_empleado_id_foreign;
ALTER TABLE ONLY public.liquidaciones DROP CONSTRAINT liquidaciones_aprobado_por_foreign;
ALTER TABLE ONLY public.liquidacion_detalle DROP CONSTRAINT liquidacion_detalle_tenant_id_foreign;
ALTER TABLE ONLY public.liquidacion_detalle DROP CONSTRAINT liquidacion_detalle_liquidacion_id_foreign;
ALTER TABLE ONLY public.liquidacion_detalle DROP CONSTRAINT liquidacion_detalle_concepto_id_foreign;
ALTER TABLE ONLY public.lineas DROP CONSTRAINT lineas_tenant_id_foreign;
ALTER TABLE ONLY public.lineas DROP CONSTRAINT lineas_sublote_id_foreign;
ALTER TABLE ONLY public.labores DROP CONSTRAINT labores_tenant_id_foreign;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_tenant_id_foreign;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_sublote_id_foreign;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_operacion_id_foreign;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_lote_id_foreign;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_labor_id_foreign;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_insumo_id_foreign;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_empleado_id_foreign;
ALTER TABLE ONLY public.insumos DROP CONSTRAINT insumos_tenant_id_foreign;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_tipo_hora_extra_id_foreign;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_tenant_id_foreign;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_operacion_id_foreign;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_nomina_id_foreign;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_empleado_id_foreign;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_creado_por_foreign;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_aprobado_por_foreign;
ALTER TABLE ONLY public.fondos_pension DROP CONSTRAINT fondos_pension_tenant_id_foreign;
ALTER TABLE ONLY public.extractoras DROP CONSTRAINT extractoras_tenant_id_foreign;
ALTER TABLE ONLY public.extractoras DROP CONSTRAINT extractoras_municipio_codigo_foreign;
ALTER TABLE ONLY public.extractoras DROP CONSTRAINT extractoras_departamento_codigo_foreign;
ALTER TABLE ONLY public.eps DROP CONSTRAINT eps_tenant_id_foreign;
ALTER TABLE ONLY public.entidades_bancarias DROP CONSTRAINT entidades_bancarias_tenant_id_foreign;
ALTER TABLE ONLY public.empresa_transportadora DROP CONSTRAINT empresa_transportadora_tenant_id_foreign;
ALTER TABLE ONLY public.empleados DROP CONSTRAINT empleados_tenant_id_foreign;
ALTER TABLE ONLY public.empleados DROP CONSTRAINT empleados_predio_id_foreign;
ALTER TABLE ONLY public.empleado_documentos DROP CONSTRAINT empleado_documentos_tenant_id_foreign;
ALTER TABLE ONLY public.empleado_documentos DROP CONSTRAINT empleado_documentos_subido_por_foreign;
ALTER TABLE ONLY public.empleado_documentos DROP CONSTRAINT empleado_documentos_empleado_id_foreign;
ALTER TABLE ONLY public.empleado_contratos DROP CONSTRAINT empleado_contratos_tenant_id_foreign;
ALTER TABLE ONLY public.empleado_contratos DROP CONSTRAINT empleado_contratos_empleado_id_foreign;
ALTER TABLE ONLY public.cosecha_cuadrilla DROP CONSTRAINT cosecha_cuadrilla_tenant_id_foreign;
ALTER TABLE ONLY public.cosecha_cuadrilla DROP CONSTRAINT cosecha_cuadrilla_empleado_id_foreign;
ALTER TABLE ONLY public.cosecha_cuadrilla DROP CONSTRAINT cosecha_cuadrilla_cosecha_id_foreign;
ALTER TABLE ONLY public.cargos DROP CONSTRAINT cargos_tenant_id_foreign;
ALTER TABLE ONLY public.cargos DROP CONSTRAINT cargos_modalidad_id_foreign;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_tenant_id_foreign;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_operacion_id_foreign;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_nomina_id_foreign;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_motivo_ausencia_id_foreign;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_empleado_id_foreign;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_creado_por_foreign;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_aprobado_por_foreign;
ALTER TABLE ONLY public.auditorias DROP CONSTRAINT auditorias_user_id_foreign;
ALTER TABLE ONLY public.auditorias DROP CONSTRAINT auditorias_tenant_id_foreign;
ALTER TABLE ONLY public.arl DROP CONSTRAINT arl_tenant_id_foreign;
ALTER TABLE ONLY public.agro_chat_sessions DROP CONSTRAINT agro_chat_sessions_user_id_foreign;
ALTER TABLE ONLY public.agro_chat_sessions DROP CONSTRAINT agro_chat_sessions_tenant_id_foreign;
ALTER TABLE ONLY public.agro_chat_messages DROP CONSTRAINT agro_chat_messages_user_id_foreign;
ALTER TABLE ONLY public.agro_chat_messages DROP CONSTRAINT agro_chat_messages_tenant_id_foreign;
ALTER TABLE ONLY public.agro_chat_messages DROP CONSTRAINT agro_chat_messages_session_id_foreign;
DROP INDEX public.viajes_tenant_id_transportador_id_index;
DROP INDEX public.viajes_tenant_id_fecha_viaje_index;
DROP INDEX public.viajes_tenant_id_fecha_llegada_index;
DROP INDEX public.viajes_tenant_id_extractora_id_index;
DROP INDEX public.viajes_tenant_id_estado_index;
DROP INDEX public.viajes_tenant_id_calidad_materia_prima_index;
DROP INDEX public.viaje_documento_bascula_tenant_id_viaje_id_index;
DROP INDEX public.viaje_documento_bascula_tenant_id_estado_ocr_index;
DROP INDEX public.viaje_detalle_tenant_id_viaje_id_index;
DROP INDEX public.viaje_detalle_tenant_id_reconteo_aprobado_index;
DROP INDEX public.viaje_detalle_cosecha_activa_unique;
DROP INDEX public.vacaciones_tenant_id_estado_index;
DROP INDEX public.vacaciones_tenant_id_empleado_id_index;
DROP INDEX public.vacacion_acumulado_tenant_id_empleado_id_index;
DROP INDEX public.transportadores_tenant_id_estado_index;
DROP INDEX public.transportadores_tenant_id_empresa_transportadora_id_index;
DROP INDEX public.tipos_hora_extra_tenant_id_estado_index;
DROP INDEX public.tenant_user_user_id_estado_index;
DROP INDEX public.telescope_entries_type_should_display_on_index_index;
DROP INDEX public.telescope_entries_tags_tag_index;
DROP INDEX public.telescope_entries_family_hash_index;
DROP INDEX public.telescope_entries_created_at_index;
DROP INDEX public.telescope_entries_batch_id_index;
DROP INDEX public.sublotes_tenant_id_lote_id_index;
DROP INDEX public.sessions_user_id_index;
DROP INDEX public.sessions_last_activity_index;
DROP INDEX public.semillas_tenant_id_estado_index;
DROP INDEX public.semilla_lote_tenant_id_index;
DROP INDEX public.roles_team_foreign_key_index;
DROP INDEX public.registro_cosecha_tenant_id_operacion_id_index;
DROP INDEX public.registro_cosecha_tenant_id_lote_id_index;
DROP INDEX public.pulse_values_type_index;
DROP INDEX public.pulse_values_timestamp_index;
DROP INDEX public.pulse_entries_type_index;
DROP INDEX public.pulse_entries_timestamp_type_key_hash_value_index;
DROP INDEX public.pulse_entries_timestamp_index;
DROP INDEX public.pulse_entries_key_hash_index;
DROP INDEX public.pulse_aggregates_type_index;
DROP INDEX public.pulse_aggregates_period_type_aggregate_bucket_index;
DROP INDEX public.pulse_aggregates_period_bucket_index;
DROP INDEX public.promedio_lote_tenant_id_anio_index;
DROP INDEX public.predios_tenant_id_estado_index;
DROP INDEX public.precios_palma_tenant_id_estado_index;
DROP INDEX public.precio_cosecha_tenant_id_anio_index;
DROP INDEX public.precio_abono_tenant_id_estado_index;
DROP INDEX public.palmas_tenant_id_sublote_id_index;
DROP INDEX public.palmas_linea_id_index;
DROP INDEX public.operaciones_tenant_id_fecha_index;
DROP INDEX public.operaciones_tenant_id_estado_index;
DROP INDEX public.nominas_tenant_id_estado_index;
DROP INDEX public.nominas_tenant_id_anio_mes_index;
DROP INDEX public.nomina_tabla_legal_tenant_id_concepto_id_index;
DROP INDEX public.nomina_jornal_ref_tenant_id_nomina_empleado_id_index;
DROP INDEX public.nomina_hora_extra_ref_tenant_id_nomina_empleado_id_index;
DROP INDEX public.nomina_empleado_tenant_id_nomina_id_index;
DROP INDEX public.nomina_empleado_tenant_id_empleado_id_index;
DROP INDEX public.nomina_empleado_concepto_tenant_id_nomina_empleado_id_index;
DROP INDEX public.nomina_cosecha_ref_tenant_id_nomina_empleado_id_index;
DROP INDEX public.nomina_concepto_tenant_id_activo_index;
DROP INDEX public.municipios_departamento_codigo_nombre_index;
DROP INDEX public.motivos_ausencia_tenant_id_estado_index;
DROP INDEX public.model_has_roles_team_foreign_key_index;
DROP INDEX public.model_has_roles_model_id_model_type_index;
DROP INDEX public.model_has_permissions_team_foreign_key_index;
DROP INDEX public.model_has_permissions_model_id_model_type_index;
DROP INDEX public.modalidad_contrato_tenant_id_estado_index;
DROP INDEX public.lotes_tenant_id_predio_id_index;
DROP INDEX public.lotes_tenant_id_estado_index;
DROP INDEX public.liquidaciones_tenant_id_estado_index;
DROP INDEX public.liquidaciones_tenant_id_empleado_id_index;
DROP INDEX public.liquidacion_detalle_tenant_id_liquidacion_id_index;
DROP INDEX public.lineas_tenant_id_sublote_id_index;
DROP INDEX public.labores_tenant_id_estado_index;
DROP INDEX public.jornales_tenant_id_operacion_id_empleado_id_index;
DROP INDEX public.jornales_tenant_id_estado_index;
DROP INDEX public.jornales_tenant_id_categoria_tipo_index;
DROP INDEX public.jobs_queue_index;
DROP INDEX public.insumos_tenant_id_estado_index;
DROP INDEX public.idx_agro_chat_sessions_user_tenant;
DROP INDEX public.idx_agro_chat_messages_user;
DROP INDEX public.idx_agro_chat_messages_session;
DROP INDEX public.horas_extra_tenant_id_operacion_id_index;
DROP INDEX public.horas_extra_tenant_id_nomina_id_index;
DROP INDEX public.horas_extra_tenant_id_estado_index;
DROP INDEX public.horas_extra_tenant_id_empleado_id_index;
DROP INDEX public.fondos_pension_tenant_id_estado_index;
DROP INDEX public.extractoras_tenant_id_estado_index;
DROP INDEX public.eps_tenant_id_estado_index;
DROP INDEX public.entidades_bancarias_tenant_id_estado_index;
DROP INDEX public.empresa_transportadora_tenant_id_estado_index;
DROP INDEX public.empleados_tenant_id_predio_id_index;
DROP INDEX public.empleados_tenant_id_modalidad_pago_index;
DROP INDEX public.empleados_tenant_id_estado_index;
DROP INDEX public.empleados_tenant_doc_active_unique;
DROP INDEX public.empleado_documentos_tenant_id_estado_index;
DROP INDEX public.empleado_documentos_tenant_id_empleado_id_index;
DROP INDEX public.empleado_documentos_tenant_id_empleado_id_categoria_index;
DROP INDEX public.empleado_contratos_tenant_id_estado_index;
DROP INDEX public.empleado_contratos_tenant_id_empleado_id_index;
DROP INDEX public.empleado_contratos_tenant_id_empleado_id_estado_contrato_index;
DROP INDEX public.departamentos_nombre_index;
DROP INDEX public.cosecha_cuadrilla_tenant_id_empleado_id_index;
DROP INDEX public.cosecha_cuadrilla_tenant_id_cosecha_id_index;
DROP INDEX public.cargos_tenant_id_estado_index;
DROP INDEX public.cache_locks_expiration_index;
DROP INDEX public.cache_expiration_index;
DROP INDEX public.ausencias_tenant_id_operacion_id_index;
DROP INDEX public.ausencias_tenant_id_nomina_id_index;
DROP INDEX public.ausencias_tenant_id_motivo_ausencia_id_index;
DROP INDEX public.ausencias_tenant_id_fecha_inicio_fecha_fin_index;
DROP INDEX public.ausencias_tenant_id_estado_index;
DROP INDEX public.ausencias_tenant_id_empleado_id_fecha_inicio_index;
DROP INDEX public.auditorias_tenant_id_created_at_index;
DROP INDEX public.auditorias_modulo_index;
DROP INDEX public.auditorias_accion_index;
DROP INDEX public.arl_tenant_id_estado_index;
ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_tenant_id_remision_unique;
ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_sync_uuid_unique;
ALTER TABLE ONLY public.viajes DROP CONSTRAINT viajes_pkey;
ALTER TABLE ONLY public.viaje_documento_bascula DROP CONSTRAINT viaje_documento_bascula_pkey;
ALTER TABLE ONLY public.viaje_detalle DROP CONSTRAINT viaje_detalle_pkey;
ALTER TABLE ONLY public.vacaciones DROP CONSTRAINT vacaciones_pkey;
ALTER TABLE ONLY public.vacacion_acumulado DROP CONSTRAINT vacacion_acumulado_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_unique;
ALTER TABLE ONLY public.transportadores DROP CONSTRAINT transportadores_tenant_id_placa_vehiculo_unique;
ALTER TABLE ONLY public.transportadores DROP CONSTRAINT transportadores_pkey;
ALTER TABLE ONLY public.tipos_hora_extra DROP CONSTRAINT tipos_hora_extra_tenant_id_codigo_unique;
ALTER TABLE ONLY public.tipos_hora_extra DROP CONSTRAINT tipos_hora_extra_pkey;
ALTER TABLE ONLY public.tenants DROP CONSTRAINT tenants_pkey;
ALTER TABLE ONLY public.tenants DROP CONSTRAINT tenants_nit_unique;
ALTER TABLE ONLY public.tenant_user DROP CONSTRAINT tenant_user_tenant_id_user_id_unique;
ALTER TABLE ONLY public.tenant_user DROP CONSTRAINT tenant_user_pkey;
ALTER TABLE ONLY public.tenant_config DROP CONSTRAINT tenant_config_tenant_id_unique;
ALTER TABLE ONLY public.tenant_config DROP CONSTRAINT tenant_config_pkey;
ALTER TABLE ONLY public.telescope_monitoring DROP CONSTRAINT telescope_monitoring_pkey;
ALTER TABLE ONLY public.telescope_entries DROP CONSTRAINT telescope_entries_uuid_unique;
ALTER TABLE ONLY public.telescope_entries_tags DROP CONSTRAINT telescope_entries_tags_pkey;
ALTER TABLE ONLY public.telescope_entries DROP CONSTRAINT telescope_entries_pkey;
ALTER TABLE ONLY public.sublotes DROP CONSTRAINT sublotes_pkey;
ALTER TABLE ONLY public.sessions DROP CONSTRAINT sessions_pkey;
ALTER TABLE ONLY public.semillas DROP CONSTRAINT semillas_pkey;
ALTER TABLE ONLY public.semilla_lote DROP CONSTRAINT semilla_lote_pkey;
ALTER TABLE ONLY public.semilla_lote DROP CONSTRAINT semilla_lote_lote_id_semilla_id_unique;
ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_tenant_id_name_guard_name_unique;
ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_pkey;
ALTER TABLE ONLY public.role_has_permissions DROP CONSTRAINT role_has_permissions_pkey;
ALTER TABLE ONLY public.registro_cosecha DROP CONSTRAINT registro_cosecha_sync_uuid_unique;
ALTER TABLE ONLY public.registro_cosecha DROP CONSTRAINT registro_cosecha_pkey;
ALTER TABLE ONLY public.pulse_values DROP CONSTRAINT pulse_values_type_key_hash_unique;
ALTER TABLE ONLY public.pulse_values DROP CONSTRAINT pulse_values_pkey;
ALTER TABLE ONLY public.pulse_entries DROP CONSTRAINT pulse_entries_pkey;
ALTER TABLE ONLY public.pulse_aggregates DROP CONSTRAINT pulse_aggregates_pkey;
ALTER TABLE ONLY public.pulse_aggregates DROP CONSTRAINT pulse_aggregates_bucket_period_type_aggregate_key_hash_unique;
ALTER TABLE ONLY public.promedio_lote DROP CONSTRAINT promedio_lote_pkey;
ALTER TABLE ONLY public.promedio_lote DROP CONSTRAINT promedio_lote_lote_id_anio_unique;
ALTER TABLE ONLY public.predios DROP CONSTRAINT predios_pkey;
ALTER TABLE ONLY public.precios_palma DROP CONSTRAINT precios_palma_tenant_tipo_unique;
ALTER TABLE ONLY public.precios_palma DROP CONSTRAINT precios_palma_pkey;
ALTER TABLE ONLY public.precio_cosecha DROP CONSTRAINT precio_cosecha_pkey;
ALTER TABLE ONLY public.precio_cosecha DROP CONSTRAINT precio_cosecha_lote_id_anio_unique;
ALTER TABLE ONLY public.precio_abono DROP CONSTRAINT precio_abono_pkey;
ALTER TABLE ONLY public.permissions DROP CONSTRAINT permissions_pkey;
ALTER TABLE ONLY public.permissions DROP CONSTRAINT permissions_name_guard_name_unique;
ALTER TABLE ONLY public.password_reset_tokens DROP CONSTRAINT password_reset_tokens_pkey;
ALTER TABLE ONLY public.palmas DROP CONSTRAINT palmas_sublote_id_codigo_unique;
ALTER TABLE ONLY public.palmas DROP CONSTRAINT palmas_pkey;
ALTER TABLE ONLY public.operaciones DROP CONSTRAINT operaciones_tenant_id_fecha_unique;
ALTER TABLE ONLY public.operaciones DROP CONSTRAINT operaciones_pkey;
ALTER TABLE ONLY public.nominas DROP CONSTRAINT nominas_tenant_periodo_unique;
ALTER TABLE ONLY public.nominas DROP CONSTRAINT nominas_pkey;
ALTER TABLE ONLY public.nomina_tabla_legal DROP CONSTRAINT nomina_tabla_legal_pkey;
ALTER TABLE ONLY public.nomina_jornal_ref DROP CONSTRAINT nomina_jornal_ref_pkey;
ALTER TABLE ONLY public.nomina_jornal_ref DROP CONSTRAINT nomina_jornal_ref_nomina_empleado_id_jornal_id_unique;
ALTER TABLE ONLY public.nomina_hora_extra_ref DROP CONSTRAINT nomina_hora_extra_ref_pkey;
ALTER TABLE ONLY public.nomina_hora_extra_ref DROP CONSTRAINT nomina_hora_extra_ref_nomina_empleado_id_hora_extra_id_unique;
ALTER TABLE ONLY public.nomina_empleado DROP CONSTRAINT nomina_empleado_pkey;
ALTER TABLE ONLY public.nomina_empleado DROP CONSTRAINT nomina_empleado_nomina_id_empleado_id_unique;
ALTER TABLE ONLY public.nomina_empleado_concepto DROP CONSTRAINT nomina_empleado_concepto_pkey;
ALTER TABLE ONLY public.nomina_cosecha_ref DROP CONSTRAINT nomina_cosecha_ref_pkey;
ALTER TABLE ONLY public.nomina_cosecha_ref DROP CONSTRAINT nomina_cosecha_ref_nomina_empleado_id_cosecha_cuadrilla_id_uniq;
ALTER TABLE ONLY public.nomina_concepto DROP CONSTRAINT nomina_concepto_tenant_id_codigo_unique;
ALTER TABLE ONLY public.nomina_concepto DROP CONSTRAINT nomina_concepto_pkey;
ALTER TABLE ONLY public.municipios DROP CONSTRAINT municipios_pkey;
ALTER TABLE ONLY public.motivos_ausencia DROP CONSTRAINT motivos_ausencia_tenant_id_nombre_unique;
ALTER TABLE ONLY public.motivos_ausencia DROP CONSTRAINT motivos_ausencia_pkey;
ALTER TABLE ONLY public.model_has_roles DROP CONSTRAINT model_has_roles_pkey;
ALTER TABLE ONLY public.model_has_permissions DROP CONSTRAINT model_has_permissions_pkey;
ALTER TABLE ONLY public.modalidad_contrato DROP CONSTRAINT modalidad_contrato_pkey;
ALTER TABLE ONLY public.migrations DROP CONSTRAINT migrations_pkey;
ALTER TABLE ONLY public.lotes DROP CONSTRAINT lotes_pkey;
ALTER TABLE ONLY public.liquidaciones DROP CONSTRAINT liquidaciones_pkey;
ALTER TABLE ONLY public.liquidacion_detalle DROP CONSTRAINT liquidacion_detalle_pkey;
ALTER TABLE ONLY public.lineas DROP CONSTRAINT lineas_sublote_id_numero_unique;
ALTER TABLE ONLY public.lineas DROP CONSTRAINT lineas_pkey;
ALTER TABLE ONLY public.labores DROP CONSTRAINT labores_tenant_nombre_unique;
ALTER TABLE ONLY public.labores DROP CONSTRAINT labores_pkey;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_sync_uuid_unique;
ALTER TABLE ONLY public.jornales DROP CONSTRAINT jornales_pkey;
ALTER TABLE ONLY public.jobs DROP CONSTRAINT jobs_pkey;
ALTER TABLE ONLY public.job_batches DROP CONSTRAINT job_batches_pkey;
ALTER TABLE ONLY public.insumos DROP CONSTRAINT insumos_tenant_id_nombre_unique;
ALTER TABLE ONLY public.insumos DROP CONSTRAINT insumos_pkey;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_sync_uuid_unique;
ALTER TABLE ONLY public.horas_extra DROP CONSTRAINT horas_extra_pkey;
ALTER TABLE ONLY public.fondos_pension DROP CONSTRAINT fondos_pension_tenant_id_nombre_unique;
ALTER TABLE ONLY public.fondos_pension DROP CONSTRAINT fondos_pension_pkey;
ALTER TABLE ONLY public.failed_jobs DROP CONSTRAINT failed_jobs_uuid_unique;
ALTER TABLE ONLY public.failed_jobs DROP CONSTRAINT failed_jobs_pkey;
ALTER TABLE ONLY public.extractoras DROP CONSTRAINT extractoras_tenant_id_nit_unique;
ALTER TABLE ONLY public.extractoras DROP CONSTRAINT extractoras_pkey;
ALTER TABLE ONLY public.eps DROP CONSTRAINT eps_tenant_id_nombre_unique;
ALTER TABLE ONLY public.eps DROP CONSTRAINT eps_pkey;
ALTER TABLE ONLY public.entidades_bancarias DROP CONSTRAINT entidades_bancarias_tenant_id_nombre_unique;
ALTER TABLE ONLY public.entidades_bancarias DROP CONSTRAINT entidades_bancarias_pkey;
ALTER TABLE ONLY public.empresa_transportadora DROP CONSTRAINT empresa_transportadora_tenant_id_nit_unique;
ALTER TABLE ONLY public.empresa_transportadora DROP CONSTRAINT empresa_transportadora_pkey;
ALTER TABLE ONLY public.empleados DROP CONSTRAINT empleados_pkey;
ALTER TABLE ONLY public.empleado_documentos DROP CONSTRAINT empleado_documentos_pkey;
ALTER TABLE ONLY public.empleado_contratos DROP CONSTRAINT empleado_contratos_pkey;
ALTER TABLE ONLY public.departamentos DROP CONSTRAINT departamentos_pkey;
ALTER TABLE ONLY public.cosecha_cuadrilla DROP CONSTRAINT cosecha_cuadrilla_pkey;
ALTER TABLE ONLY public.cargos DROP CONSTRAINT cargos_pkey;
ALTER TABLE ONLY public.cache DROP CONSTRAINT cache_pkey;
ALTER TABLE ONLY public.cache_locks DROP CONSTRAINT cache_locks_pkey;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_sync_uuid_unique;
ALTER TABLE ONLY public.ausencias DROP CONSTRAINT ausencias_pkey;
ALTER TABLE ONLY public.auditorias DROP CONSTRAINT auditorias_pkey;
ALTER TABLE ONLY public.arl DROP CONSTRAINT arl_tenant_id_nombre_unique;
ALTER TABLE ONLY public.arl DROP CONSTRAINT arl_pkey;
ALTER TABLE ONLY public.agro_chat_sessions DROP CONSTRAINT agro_chat_sessions_pkey;
ALTER TABLE ONLY public.agro_chat_messages DROP CONSTRAINT agro_chat_messages_pkey;
ALTER TABLE public.viajes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.viaje_documento_bascula ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.viaje_detalle ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.vacaciones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.vacacion_acumulado ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.transportadores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tipos_hora_extra ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tenants ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tenant_user ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tenant_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.telescope_entries ALTER COLUMN sequence DROP DEFAULT;
ALTER TABLE public.sublotes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.semillas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.semilla_lote ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.registro_cosecha ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.pulse_values ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.pulse_entries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.pulse_aggregates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.promedio_lote ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.predios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.precios_palma ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.precio_cosecha ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.precio_abono ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.permissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.palmas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.operaciones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nominas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nomina_tabla_legal ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nomina_jornal_ref ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nomina_hora_extra_ref ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nomina_empleado_concepto ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nomina_empleado ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nomina_cosecha_ref ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.nomina_concepto ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.motivos_ausencia ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.modalidad_contrato ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.migrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.lotes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.liquidaciones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.liquidacion_detalle ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.lineas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.labores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.jornales ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.jobs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.insumos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.horas_extra ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fondos_pension ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.failed_jobs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.extractoras ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.eps ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.entidades_bancarias ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.empresa_transportadora ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.empleados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.empleado_documentos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.empleado_contratos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.cosecha_cuadrilla ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.cargos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.ausencias ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.auditorias ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.arl ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.agro_chat_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.agro_chat_messages ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.viajes_id_seq;
DROP TABLE public.viajes;
DROP SEQUENCE public.viaje_documento_bascula_id_seq;
DROP TABLE public.viaje_documento_bascula;
DROP SEQUENCE public.viaje_detalle_id_seq;
DROP TABLE public.viaje_detalle;
DROP SEQUENCE public.vacaciones_id_seq;
DROP TABLE public.vacaciones;
DROP SEQUENCE public.vacacion_acumulado_id_seq;
DROP TABLE public.vacacion_acumulado;
DROP SEQUENCE public.users_id_seq;
DROP TABLE public.users;
DROP SEQUENCE public.transportadores_id_seq;
DROP TABLE public.transportadores;
DROP SEQUENCE public.tipos_hora_extra_id_seq;
DROP TABLE public.tipos_hora_extra;
DROP SEQUENCE public.tenants_id_seq;
DROP TABLE public.tenants;
DROP SEQUENCE public.tenant_user_id_seq;
DROP TABLE public.tenant_user;
DROP SEQUENCE public.tenant_config_id_seq;
DROP TABLE public.tenant_config;
DROP TABLE public.telescope_monitoring;
DROP TABLE public.telescope_entries_tags;
DROP SEQUENCE public.telescope_entries_sequence_seq;
DROP TABLE public.telescope_entries;
DROP SEQUENCE public.sublotes_id_seq;
DROP TABLE public.sublotes;
DROP TABLE public.sessions;
DROP SEQUENCE public.semillas_id_seq;
DROP TABLE public.semillas;
DROP SEQUENCE public.semilla_lote_id_seq;
DROP TABLE public.semilla_lote;
DROP SEQUENCE public.roles_id_seq;
DROP TABLE public.roles;
DROP TABLE public.role_has_permissions;
DROP SEQUENCE public.registro_cosecha_id_seq;
DROP TABLE public.registro_cosecha;
DROP SEQUENCE public.pulse_values_id_seq;
DROP TABLE public.pulse_values;
DROP SEQUENCE public.pulse_entries_id_seq;
DROP TABLE public.pulse_entries;
DROP SEQUENCE public.pulse_aggregates_id_seq;
DROP TABLE public.pulse_aggregates;
DROP SEQUENCE public.promedio_lote_id_seq;
DROP TABLE public.promedio_lote;
DROP SEQUENCE public.predios_id_seq;
DROP TABLE public.predios;
DROP SEQUENCE public.precios_palma_id_seq;
DROP TABLE public.precios_palma;
DROP SEQUENCE public.precio_cosecha_id_seq;
DROP TABLE public.precio_cosecha;
DROP SEQUENCE public.precio_abono_id_seq;
DROP TABLE public.precio_abono;
DROP SEQUENCE public.permissions_id_seq;
DROP TABLE public.permissions;
DROP TABLE public.password_reset_tokens;
DROP SEQUENCE public.palmas_id_seq;
DROP TABLE public.palmas;
DROP SEQUENCE public.operaciones_id_seq;
DROP TABLE public.operaciones;
DROP SEQUENCE public.nominas_id_seq;
DROP TABLE public.nominas;
DROP SEQUENCE public.nomina_tabla_legal_id_seq;
DROP TABLE public.nomina_tabla_legal;
DROP SEQUENCE public.nomina_jornal_ref_id_seq;
DROP TABLE public.nomina_jornal_ref;
DROP SEQUENCE public.nomina_hora_extra_ref_id_seq;
DROP TABLE public.nomina_hora_extra_ref;
DROP SEQUENCE public.nomina_empleado_id_seq;
DROP SEQUENCE public.nomina_empleado_concepto_id_seq;
DROP TABLE public.nomina_empleado_concepto;
DROP TABLE public.nomina_empleado;
DROP SEQUENCE public.nomina_cosecha_ref_id_seq;
DROP TABLE public.nomina_cosecha_ref;
DROP SEQUENCE public.nomina_concepto_id_seq;
DROP TABLE public.nomina_concepto;
DROP TABLE public.municipios;
DROP SEQUENCE public.motivos_ausencia_id_seq;
DROP TABLE public.motivos_ausencia;
DROP TABLE public.model_has_roles;
DROP TABLE public.model_has_permissions;
DROP SEQUENCE public.modalidad_contrato_id_seq;
DROP TABLE public.modalidad_contrato;
DROP SEQUENCE public.migrations_id_seq;
DROP TABLE public.migrations;
DROP SEQUENCE public.lotes_id_seq;
DROP TABLE public.lotes;
DROP SEQUENCE public.liquidaciones_id_seq;
DROP TABLE public.liquidaciones;
DROP SEQUENCE public.liquidacion_detalle_id_seq;
DROP TABLE public.liquidacion_detalle;
DROP SEQUENCE public.lineas_id_seq;
DROP TABLE public.lineas;
DROP SEQUENCE public.labores_id_seq;
DROP TABLE public.labores;
DROP SEQUENCE public.jornales_id_seq;
DROP TABLE public.jornales;
DROP SEQUENCE public.jobs_id_seq;
DROP TABLE public.jobs;
DROP TABLE public.job_batches;
DROP SEQUENCE public.insumos_id_seq;
DROP TABLE public.insumos;
DROP SEQUENCE public.horas_extra_id_seq;
DROP TABLE public.horas_extra;
DROP SEQUENCE public.fondos_pension_id_seq;
DROP TABLE public.fondos_pension;
DROP SEQUENCE public.failed_jobs_id_seq;
DROP TABLE public.failed_jobs;
DROP SEQUENCE public.extractoras_id_seq;
DROP TABLE public.extractoras;
DROP SEQUENCE public.eps_id_seq;
DROP TABLE public.eps;
DROP SEQUENCE public.entidades_bancarias_id_seq;
DROP TABLE public.entidades_bancarias;
DROP SEQUENCE public.empresa_transportadora_id_seq;
DROP TABLE public.empresa_transportadora;
DROP SEQUENCE public.empleados_id_seq;
DROP TABLE public.empleados;
DROP SEQUENCE public.empleado_documentos_id_seq;
DROP TABLE public.empleado_documentos;
DROP SEQUENCE public.empleado_contratos_id_seq;
DROP TABLE public.empleado_contratos;
DROP TABLE public.departamentos;
DROP SEQUENCE public.cosecha_cuadrilla_id_seq;
DROP TABLE public.cosecha_cuadrilla;
DROP SEQUENCE public.cargos_id_seq;
DROP TABLE public.cargos;
DROP TABLE public.cache_locks;
DROP TABLE public.cache;
DROP SEQUENCE public.ausencias_id_seq;
DROP TABLE public.ausencias;
DROP SEQUENCE public.auditorias_id_seq;
DROP TABLE public.auditorias;
DROP SEQUENCE public.arl_id_seq;
DROP TABLE public.arl;
DROP SEQUENCE public.agro_chat_sessions_id_seq;
DROP TABLE public.agro_chat_sessions;
DROP SEQUENCE public.agro_chat_messages_id_seq;
DROP TABLE public.agro_chat_messages;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 326 (class 1259 OID 77153)
-- Name: agro_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agro_chat_messages (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    user_id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    tool_calls jsonb,
    tokens_in integer,
    tokens_out integer,
    created_at timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 325 (class 1259 OID 77152)
-- Name: agro_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agro_chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4506 (class 0 OID 0)
-- Dependencies: 325
-- Name: agro_chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agro_chat_messages_id_seq OWNED BY public.agro_chat_messages.id;


--
-- TOC entry 324 (class 1259 OID 77134)
-- Name: agro_chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agro_chat_sessions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    titulo character varying(200) DEFAULT ''::character varying NOT NULL,
    created_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone
);


--
-- TOC entry 323 (class 1259 OID 77133)
-- Name: agro_chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agro_chat_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4509 (class 0 OID 0)
-- Dependencies: 323
-- Name: agro_chat_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agro_chat_sessions_id_seq OWNED BY public.agro_chat_sessions.id;


--
-- TOC entry 352 (class 1259 OID 77556)
-- Name: arl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arl (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 351 (class 1259 OID 77555)
-- Name: arl_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.arl_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4512 (class 0 OID 0)
-- Dependencies: 351
-- Name: arl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arl_id_seq OWNED BY public.arl.id;


--
-- TOC entry 235 (class 1259 OID 75975)
-- Name: auditorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditorias (
    id bigint NOT NULL,
    tenant_id bigint,
    user_id bigint,
    usuario character varying(40) NOT NULL,
    correo character varying(60) NOT NULL,
    accion character varying(50) NOT NULL,
    modulo character varying(50),
    observaciones character varying(900) NOT NULL,
    direccion_ip character varying(45),
    user_agent character varying(500),
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 234 (class 1259 OID 75974)
-- Name: auditorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditorias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4515 (class 0 OID 0)
-- Dependencies: 234
-- Name: auditorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditorias_id_seq OWNED BY public.auditorias.id;


--
-- TOC entry 322 (class 1259 OID 77043)
-- Name: ausencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ausencias (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    operacion_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    tipo character varying(30) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    dias_calendario integer DEFAULT 0 NOT NULL,
    dias_habiles integer DEFAULT 0 NOT NULL,
    es_remunerada boolean DEFAULT false NOT NULL,
    afecta_nomina boolean DEFAULT true NOT NULL,
    porcentaje_pago numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    valor_dia_base numeric(12,2),
    valor_calculado numeric(12,2),
    entidad character varying(100),
    numero_radicado character varying(50),
    motivo text,
    documento_soporte character varying(500),
    estado character varying(255) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    aprobado_por bigint,
    aprobado_at timestamp(0) without time zone,
    nomina_id bigint,
    creado_por bigint,
    sync_uuid uuid,
    sync_estado character varying(255) DEFAULT 'SINCRONIZADO'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    motivo_ausencia_id bigint,
    motivo_rechazo text,
    CONSTRAINT ausencias_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying, 'RECHAZADA'::character varying, 'LIQUIDADA'::character varying])::text[]))),
    CONSTRAINT ausencias_sync_estado_check CHECK (((sync_estado)::text = ANY ((ARRAY['LOCAL'::character varying, 'SINCRONIZADO'::character varying])::text[]))),
    CONSTRAINT ausencias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['INCAPACIDAD_EPS'::character varying, 'INCAPACIDAD_ARL'::character varying, 'LICENCIA_MATERNIDAD'::character varying, 'LICENCIA_PATERNIDAD'::character varying, 'LICENCIA_LUTO'::character varying, 'PERMISO_REMUNERADO'::character varying, 'PERMISO_NO_REMUNERADO'::character varying, 'AUSENCIA_INJUSTIFICADA'::character varying, 'CALAMIDAD_DOMESTICA'::character varying, 'SUSPENSION_DISCIPLINARIA'::character varying, 'OTRO'::character varying])::text[])))
);


--
-- TOC entry 321 (class 1259 OID 77042)
-- Name: ausencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ausencias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4518 (class 0 OID 0)
-- Dependencies: 321
-- Name: ausencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ausencias_id_seq OWNED BY public.ausencias.id;


--
-- TOC entry 223 (class 1259 OID 75874)
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 75882)
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


--
-- TOC entry 263 (class 1259 OID 76242)
-- Name: cargos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cargos (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    modalidad_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    salario_tipo character varying(255) NOT NULL,
    salario numeric(12,2),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT cargos_salario_tipo_check CHECK (((salario_tipo)::text = ANY ((ARRAY['FIJO'::character varying, 'VARIABLE'::character varying])::text[])))
);


--
-- TOC entry 262 (class 1259 OID 76241)
-- Name: cargos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cargos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4523 (class 0 OID 0)
-- Dependencies: 262
-- Name: cargos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cargos_id_seq OWNED BY public.cargos.id;


--
-- TOC entry 273 (class 1259 OID 76408)
-- Name: cosecha_cuadrilla; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cosecha_cuadrilla (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    cosecha_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    peso_calculado_empleado numeric(10,2),
    valor_calculado numeric(10,2),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 272 (class 1259 OID 76407)
-- Name: cosecha_cuadrilla_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cosecha_cuadrilla_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4526 (class 0 OID 0)
-- Dependencies: 272
-- Name: cosecha_cuadrilla_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cosecha_cuadrilla_id_seq OWNED BY public.cosecha_cuadrilla.id;


--
-- TOC entry 313 (class 1259 OID 76895)
-- Name: departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamentos (
    codigo character(2) NOT NULL,
    nombre character varying(100) NOT NULL
);


--
-- TOC entry 318 (class 1259 OID 76980)
-- Name: empleado_contratos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleado_contratos (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_terminacion date,
    salario numeric(12,2),
    estado_contrato character varying(255) DEFAULT 'VIGENTE'::character varying NOT NULL,
    adjunto_path character varying(500),
    adjunto_nombre_original character varying(255),
    observacion character varying(500),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT empleado_contratos_estado_contrato_check CHECK (((estado_contrato)::text = ANY ((ARRAY['VIGENTE'::character varying, 'TERMINADO'::character varying])::text[])))
);


--
-- TOC entry 317 (class 1259 OID 76979)
-- Name: empleado_contratos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleado_contratos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4530 (class 0 OID 0)
-- Dependencies: 317
-- Name: empleado_contratos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleado_contratos_id_seq OWNED BY public.empleado_contratos.id;


--
-- TOC entry 320 (class 1259 OID 77015)
-- Name: empleado_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleado_documentos (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    categoria character varying(50) NOT NULL,
    tipo_documento character varying(80) NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    archivo_path character varying(500) NOT NULL,
    archivo_nombre_original character varying(255) NOT NULL,
    mime_type character varying(100),
    archivo_tamano integer,
    fecha_documento date,
    observacion character varying(500),
    subido_por bigint,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 319 (class 1259 OID 77014)
-- Name: empleado_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleado_documentos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4533 (class 0 OID 0)
-- Dependencies: 319
-- Name: empleado_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleado_documentos_id_seq OWNED BY public.empleado_documentos.id;


--
-- TOC entry 265 (class 1259 OID 76262)
-- Name: empleados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleados (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    primer_nombre character varying(50) NOT NULL,
    primer_apellido character varying(50) NOT NULL,
    tipo_documento character varying(10) DEFAULT 'CC'::character varying NOT NULL,
    documento character varying(50) NOT NULL,
    correo_electronico character varying(100),
    telefono character varying(50),
    fecha_nacimiento date,
    fecha_ingreso date NOT NULL,
    fecha_retiro date,
    direccion character varying(200),
    municipio character varying(100),
    departamento character varying(100),
    eps character varying(50) NOT NULL,
    fondo_pension character varying(50) NOT NULL,
    arl character varying(50) NOT NULL,
    caja_compensacion character varying(50),
    talla_camisa character varying(10),
    talla_pantalon character varying(10),
    talla_calzado character varying(5),
    tipo_cuenta character varying(255) DEFAULT 'EFECTIVO'::character varying NOT NULL,
    entidad_bancaria character varying(50),
    numero_cuenta character varying(30),
    contacto_emergencia_nombre character varying(100),
    contacto_emergencia_telefono character varying(50),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    fecha_expedicion_documento date NOT NULL,
    lugar_expedicion character varying(100),
    segundo_nombre character varying(50),
    segundo_apellido character varying(50),
    cargo character varying(100) NOT NULL,
    salario_base numeric(12,2) NOT NULL,
    modalidad_pago character varying(255) NOT NULL,
    predio_id bigint,
    avatar_path character varying(500),
    deleted_at timestamp(0) without time zone,
    CONSTRAINT empleados_modalidad_pago_check CHECK (((modalidad_pago)::text = ANY ((ARRAY['FIJO'::character varying, 'PRODUCCION'::character varying])::text[]))),
    CONSTRAINT empleados_tipo_cuenta_check CHECK (((tipo_cuenta)::text = ANY ((ARRAY['AHORROS'::character varying, 'CORRIENTE'::character varying, 'EFECTIVO'::character varying])::text[])))
);


--
-- TOC entry 264 (class 1259 OID 76261)
-- Name: empleados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4536 (class 0 OID 0)
-- Dependencies: 264
-- Name: empleados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleados_id_seq OWNED BY public.empleados.id;


--
-- TOC entry 334 (class 1259 OID 77286)
-- Name: empresa_transportadora; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa_transportadora (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    razon_social character varying(150) NOT NULL,
    nit character varying(30) NOT NULL,
    telefono character varying(30),
    direccion character varying(200),
    ciudad character varying(100),
    email character varying(150),
    contacto_nombre character varying(150),
    observaciones text,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 333 (class 1259 OID 77285)
-- Name: empresa_transportadora_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresa_transportadora_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4539 (class 0 OID 0)
-- Dependencies: 333
-- Name: empresa_transportadora_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresa_transportadora_id_seq OWNED BY public.empresa_transportadora.id;


--
-- TOC entry 354 (class 1259 OID 77572)
-- Name: entidades_bancarias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entidades_bancarias (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 353 (class 1259 OID 77571)
-- Name: entidades_bancarias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entidades_bancarias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4542 (class 0 OID 0)
-- Dependencies: 353
-- Name: entidades_bancarias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entidades_bancarias_id_seq OWNED BY public.entidades_bancarias.id;


--
-- TOC entry 348 (class 1259 OID 77524)
-- Name: eps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eps (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 347 (class 1259 OID 77523)
-- Name: eps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4545 (class 0 OID 0)
-- Dependencies: 347
-- Name: eps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eps_id_seq OWNED BY public.eps.id;


--
-- TOC entry 338 (class 1259 OID 77328)
-- Name: extractoras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extractoras (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    razon_social character varying(150) NOT NULL,
    nit character varying(30) NOT NULL,
    ubicacion character varying(200) NOT NULL,
    departamento_codigo character(2),
    municipio_codigo character(5),
    ciudad character varying(100),
    telefono character varying(30),
    email character varying(150),
    contacto_nombre character varying(150),
    distancia_km numeric(6,2),
    observaciones text,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 337 (class 1259 OID 77327)
-- Name: extractoras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.extractoras_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4548 (class 0 OID 0)
-- Dependencies: 337
-- Name: extractoras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.extractoras_id_seq OWNED BY public.extractoras.id;


--
-- TOC entry 231 (class 1259 OID 75939)
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 230 (class 1259 OID 75938)
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4551 (class 0 OID 0)
-- Dependencies: 230
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- TOC entry 350 (class 1259 OID 77540)
-- Name: fondos_pension; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fondos_pension (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 349 (class 1259 OID 77539)
-- Name: fondos_pension_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fondos_pension_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4554 (class 0 OID 0)
-- Dependencies: 349
-- Name: fondos_pension_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fondos_pension_id_seq OWNED BY public.fondos_pension.id;


--
-- TOC entry 342 (class 1259 OID 77412)
-- Name: horas_extra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horas_extra (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    operacion_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    tipo_hora_extra_id bigint NOT NULL,
    codigo character varying(10) NOT NULL,
    porcentaje_recargo numeric(5,2) NOT NULL,
    paga_hora_completa boolean NOT NULL,
    cantidad_horas numeric(5,2) NOT NULL,
    valor_hora_base numeric(12,2) NOT NULL,
    valor_calculado numeric(12,2) NOT NULL,
    observacion text,
    estado character varying(255) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    motivo_rechazo text,
    aprobado_por bigint,
    aprobado_at timestamp(0) without time zone,
    nomina_id bigint,
    creado_por bigint,
    sync_uuid uuid,
    sync_estado character varying(255) DEFAULT 'SINCRONIZADO'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT horas_extra_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying, 'RECHAZADA'::character varying, 'LIQUIDADA'::character varying])::text[]))),
    CONSTRAINT horas_extra_sync_estado_check CHECK (((sync_estado)::text = ANY ((ARRAY['LOCAL'::character varying, 'SINCRONIZADO'::character varying])::text[])))
);


--
-- TOC entry 341 (class 1259 OID 77411)
-- Name: horas_extra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horas_extra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4557 (class 0 OID 0)
-- Dependencies: 341
-- Name: horas_extra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horas_extra_id_seq OWNED BY public.horas_extra.id;


--
-- TOC entry 255 (class 1259 OID 76172)
-- Name: insumos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insumos (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    unidad_medida character varying(100) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 254 (class 1259 OID 76171)
-- Name: insumos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.insumos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4560 (class 0 OID 0)
-- Dependencies: 254
-- Name: insumos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.insumos_id_seq OWNED BY public.insumos.id;


--
-- TOC entry 229 (class 1259 OID 75931)
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- TOC entry 228 (class 1259 OID 75922)
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 75921)
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4564 (class 0 OID 0)
-- Dependencies: 227
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- TOC entry 330 (class 1259 OID 77200)
-- Name: jornales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jornales (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    operacion_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    categoria character varying(255) NOT NULL,
    tipo character varying(255),
    labor_id bigint,
    lote_id bigint,
    sublote_id bigint,
    cantidad_palmas integer,
    insumo_id bigint,
    gramos_por_palma integer,
    descripcion text,
    ubicacion character varying(255),
    valor_unitario numeric(12,2),
    precio_insumo_snapshot numeric(12,2),
    valor_total numeric(12,2),
    observacion text,
    sync_uuid uuid,
    sync_estado character varying(255) DEFAULT 'SINCRONIZADO'::character varying NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    nombre_trabajo character varying(255),
    CONSTRAINT jornales_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['PALMA'::character varying, 'FINCA'::character varying])::text[]))),
    CONSTRAINT jornales_sync_estado_check CHECK (((sync_estado)::text = ANY ((ARRAY['LOCAL'::character varying, 'SINCRONIZADO'::character varying])::text[]))),
    CONSTRAINT jornales_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['PLATEO'::character varying, 'PODA'::character varying, 'FERTILIZACION'::character varying, 'SANIDAD'::character varying, 'OTROS'::character varying])::text[])))
);


--
-- TOC entry 329 (class 1259 OID 77199)
-- Name: jornales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jornales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4567 (class 0 OID 0)
-- Dependencies: 329
-- Name: jornales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jornales_id_seq OWNED BY public.jornales.id;


--
-- TOC entry 259 (class 1259 OID 76205)
-- Name: labores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labores (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    valor_base numeric(10,2) DEFAULT 0 NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 258 (class 1259 OID 76204)
-- Name: labores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4570 (class 0 OID 0)
-- Dependencies: 258
-- Name: labores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labores_id_seq OWNED BY public.labores.id;


--
-- TOC entry 247 (class 1259 OID 76089)
-- Name: lineas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lineas (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    sublote_id bigint NOT NULL,
    numero integer NOT NULL,
    cantidad_palmas integer DEFAULT 0 NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 246 (class 1259 OID 76088)
-- Name: lineas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lineas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4573 (class 0 OID 0)
-- Dependencies: 246
-- Name: lineas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lineas_id_seq OWNED BY public.lineas.id;


--
-- TOC entry 295 (class 1259 OID 76730)
-- Name: liquidacion_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.liquidacion_detalle (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    liquidacion_id bigint NOT NULL,
    concepto_id bigint,
    nombre_concepto character varying(150) NOT NULL,
    tipo character varying(255) NOT NULL,
    operacion character varying(255) NOT NULL,
    dias_base numeric(6,2),
    valor_base numeric(12,2),
    valor numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    formula_aplicada character varying(255),
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT liquidacion_detalle_operacion_check CHECK (((operacion)::text = ANY ((ARRAY['SUMA'::character varying, 'RESTA'::character varying])::text[]))),
    CONSTRAINT liquidacion_detalle_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['DEVENGO'::character varying, 'DEDUCCION'::character varying])::text[])))
);


--
-- TOC entry 294 (class 1259 OID 76729)
-- Name: liquidacion_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.liquidacion_detalle_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4576 (class 0 OID 0)
-- Dependencies: 294
-- Name: liquidacion_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.liquidacion_detalle_id_seq OWNED BY public.liquidacion_detalle.id;


--
-- TOC entry 293 (class 1259 OID 76687)
-- Name: liquidaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.liquidaciones (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    fecha_retiro date NOT NULL,
    motivo_retiro character varying(255) NOT NULL,
    salario_base numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    fecha_ingreso date NOT NULL,
    dias_trabajados integer DEFAULT 0 NOT NULL,
    valor_cesantias numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_intereses_ces numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_prima numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_vacaciones numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_indemnizacion numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_bonificaciones numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_salud numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_pension numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    valor_otras_deducciones numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_bruto numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_deducciones numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_neto numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    estado character varying(255) DEFAULT 'BORRADOR'::character varying NOT NULL,
    aprobado_por bigint,
    observacion text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT liquidaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['BORRADOR'::character varying, 'APROBADA'::character varying, 'PAGADA'::character varying])::text[]))),
    CONSTRAINT liquidaciones_motivo_retiro_check CHECK (((motivo_retiro)::text = ANY ((ARRAY['RENUNCIA'::character varying, 'DESPIDO_SIN_JUSTA_CAUSA'::character varying, 'DESPIDO_CON_JUSTA_CAUSA'::character varying, 'MUTUO_ACUERDO'::character varying, 'FALLECIMIENTO'::character varying, 'PENSION'::character varying])::text[])))
);


--
-- TOC entry 292 (class 1259 OID 76686)
-- Name: liquidaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.liquidaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4579 (class 0 OID 0)
-- Dependencies: 292
-- Name: liquidaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.liquidaciones_id_seq OWNED BY public.liquidaciones.id;


--
-- TOC entry 241 (class 1259 OID 76025)
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    predio_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    fecha_siembra date,
    hectareas_sembradas numeric(10,2),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 240 (class 1259 OID 76024)
-- Name: lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4582 (class 0 OID 0)
-- Dependencies: 240
-- Name: lotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lotes_id_seq OWNED BY public.lotes.id;


--
-- TOC entry 216 (class 1259 OID 51701)
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- TOC entry 215 (class 1259 OID 51700)
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4585 (class 0 OID 0)
-- Dependencies: 215
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- TOC entry 261 (class 1259 OID 76228)
-- Name: modalidad_contrato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modalidad_contrato (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 260 (class 1259 OID 76227)
-- Name: modalidad_contrato_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modalidad_contrato_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4588 (class 0 OID 0)
-- Dependencies: 260
-- Name: modalidad_contrato_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modalidad_contrato_id_seq OWNED BY public.modalidad_contrato.id;


--
-- TOC entry 300 (class 1259 OID 76781)
-- Name: model_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_permissions (
    permission_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL,
    tenant_id bigint NOT NULL
);


--
-- TOC entry 301 (class 1259 OID 76793)
-- Name: model_has_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_roles (
    role_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL,
    tenant_id bigint NOT NULL
);


--
-- TOC entry 332 (class 1259 OID 77259)
-- Name: motivos_ausencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motivos_ausencia (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo_base character varying(30) NOT NULL,
    es_remunerada boolean DEFAULT false NOT NULL,
    afecta_nomina boolean DEFAULT true NOT NULL,
    porcentaje_pago_default numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    requiere_soporte boolean DEFAULT false NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT motivos_ausencia_tipo_base_check CHECK (((tipo_base)::text = ANY ((ARRAY['INCAPACIDAD_EPS'::character varying, 'INCAPACIDAD_ARL'::character varying, 'LICENCIA_MATERNIDAD'::character varying, 'LICENCIA_PATERNIDAD'::character varying, 'LICENCIA_LUTO'::character varying, 'PERMISO_REMUNERADO'::character varying, 'PERMISO_NO_REMUNERADO'::character varying, 'AUSENCIA_INJUSTIFICADA'::character varying, 'CALAMIDAD_DOMESTICA'::character varying, 'SUSPENSION_DISCIPLINARIA'::character varying, 'OTRO'::character varying])::text[])))
);


--
-- TOC entry 331 (class 1259 OID 77258)
-- Name: motivos_ausencia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.motivos_ausencia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4593 (class 0 OID 0)
-- Dependencies: 331
-- Name: motivos_ausencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.motivos_ausencia_id_seq OWNED BY public.motivos_ausencia.id;


--
-- TOC entry 314 (class 1259 OID 76901)
-- Name: municipios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipios (
    codigo character(5) NOT NULL,
    nombre character varying(100) NOT NULL,
    departamento_codigo character(2) NOT NULL
);


--
-- TOC entry 275 (class 1259 OID 76433)
-- Name: nomina_concepto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_concepto (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    codigo character varying(20) NOT NULL,
    tipo character varying(255) NOT NULL,
    subtipo character varying(255) NOT NULL,
    operacion character varying(255) NOT NULL,
    calculo character varying(255) NOT NULL,
    valor_referencia numeric(12,4) DEFAULT '0'::numeric NOT NULL,
    base_calculo character varying(255) DEFAULT 'TOTAL_DEVENGADO'::character varying NOT NULL,
    aplica_a character varying(255) DEFAULT 'AMBOS'::character varying NOT NULL,
    es_obligatorio boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT nomina_concepto_aplica_a_check CHECK (((aplica_a)::text = ANY ((ARRAY['FIJO'::character varying, 'VARIABLE'::character varying, 'AMBOS'::character varying])::text[]))),
    CONSTRAINT nomina_concepto_base_calculo_check CHECK (((base_calculo)::text = ANY ((ARRAY['SALARIO_BASE'::character varying, 'TOTAL_DEVENGADO'::character varying, 'SALARIO_MINIMO'::character varying, 'MANUAL'::character varying])::text[]))),
    CONSTRAINT nomina_concepto_calculo_check CHECK (((calculo)::text = ANY ((ARRAY['PORCENTAJE'::character varying, 'VALOR_FIJO'::character varying, 'FORMULA'::character varying])::text[]))),
    CONSTRAINT nomina_concepto_operacion_check CHECK (((operacion)::text = ANY ((ARRAY['SUMA'::character varying, 'RESTA'::character varying])::text[]))),
    CONSTRAINT nomina_concepto_subtipo_check CHECK (((subtipo)::text = ANY ((ARRAY['SALUD'::character varying, 'PENSION'::character varying, 'ARL'::character varying, 'FONDO_SOLIDARIDAD'::character varying, 'LIBRANZA'::character varying, 'EMBARGO'::character varying, 'PRESTAMO'::character varying, 'AHORRO_VOLUNTARIO'::character varying, 'PRODUCTIVIDAD'::character varying, 'TRANSPORTE'::character varying, 'ALIMENTACION'::character varying, 'ANTIGUEDAD'::character varying, 'OTRO'::character varying])::text[]))),
    CONSTRAINT nomina_concepto_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['DEDUCCION_LEGAL'::character varying, 'DEDUCCION_VOLUNTARIA'::character varying, 'BONIFICACION_FIJA'::character varying, 'BONIFICACION_VARIABLE'::character varying])::text[])))
);


--
-- TOC entry 274 (class 1259 OID 76432)
-- Name: nomina_concepto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_concepto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4597 (class 0 OID 0)
-- Dependencies: 274
-- Name: nomina_concepto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_concepto_id_seq OWNED BY public.nomina_concepto.id;


--
-- TOC entry 287 (class 1259 OID 76602)
-- Name: nomina_cosecha_ref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_cosecha_ref (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nomina_empleado_id bigint NOT NULL,
    cosecha_cuadrilla_id bigint NOT NULL,
    valor_snapshot numeric(12,2) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 286 (class 1259 OID 76601)
-- Name: nomina_cosecha_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_cosecha_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4600 (class 0 OID 0)
-- Dependencies: 286
-- Name: nomina_cosecha_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_cosecha_ref_id_seq OWNED BY public.nomina_cosecha_ref.id;


--
-- TOC entry 281 (class 1259 OID 76510)
-- Name: nomina_empleado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_empleado (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nomina_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    salario_tipo character varying(255) NOT NULL,
    salario_base numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_jornales numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_cosecha numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_devengado numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_bonificaciones numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_deducciones numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_neto numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    estado character varying(255) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    dias_ausencia_descontados numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    total_ausencias_descuento numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_ausencias_remunerado numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_horas_extra numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_recargos numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    dias_trabajados integer DEFAULT 0 NOT NULL,
    subsidio_transporte numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_incapacidades numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cargo_snapshot character varying(100),
    predio_snapshot character varying(150),
    salario_minimo_snapshot numeric(12,2),
    liquidado_por bigint,
    liquidado_at timestamp(0) without time zone,
    CONSTRAINT nomina_empleado_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'LIQUIDADO'::character varying])::text[]))),
    CONSTRAINT nomina_empleado_salario_tipo_check CHECK (((salario_tipo)::text = ANY ((ARRAY['FIJO'::character varying, 'VARIABLE'::character varying])::text[])))
);


--
-- TOC entry 283 (class 1259 OID 76548)
-- Name: nomina_empleado_concepto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_empleado_concepto (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nomina_empleado_id bigint NOT NULL,
    concepto_id bigint NOT NULL,
    operacion character varying(255) NOT NULL,
    valor_calculado numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    porcentaje_aplicado numeric(7,4),
    base_aplicada numeric(12,2),
    es_manual boolean DEFAULT false NOT NULL,
    observacion character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT nomina_empleado_concepto_operacion_check CHECK (((operacion)::text = ANY ((ARRAY['SUMA'::character varying, 'RESTA'::character varying])::text[])))
);


--
-- TOC entry 282 (class 1259 OID 76547)
-- Name: nomina_empleado_concepto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_empleado_concepto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4604 (class 0 OID 0)
-- Dependencies: 282
-- Name: nomina_empleado_concepto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_empleado_concepto_id_seq OWNED BY public.nomina_empleado_concepto.id;


--
-- TOC entry 280 (class 1259 OID 76509)
-- Name: nomina_empleado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_empleado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4606 (class 0 OID 0)
-- Dependencies: 280
-- Name: nomina_empleado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_empleado_id_seq OWNED BY public.nomina_empleado.id;


--
-- TOC entry 344 (class 1259 OID 77468)
-- Name: nomina_hora_extra_ref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_hora_extra_ref (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nomina_empleado_id bigint NOT NULL,
    hora_extra_id bigint NOT NULL,
    valor_snapshot numeric(12,2) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 343 (class 1259 OID 77467)
-- Name: nomina_hora_extra_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_hora_extra_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4609 (class 0 OID 0)
-- Dependencies: 343
-- Name: nomina_hora_extra_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_hora_extra_ref_id_seq OWNED BY public.nomina_hora_extra_ref.id;


--
-- TOC entry 285 (class 1259 OID 76576)
-- Name: nomina_jornal_ref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_jornal_ref (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nomina_empleado_id bigint NOT NULL,
    jornal_id bigint NOT NULL,
    valor_snapshot numeric(12,2) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 284 (class 1259 OID 76575)
-- Name: nomina_jornal_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_jornal_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4612 (class 0 OID 0)
-- Dependencies: 284
-- Name: nomina_jornal_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_jornal_ref_id_seq OWNED BY public.nomina_jornal_ref.id;


--
-- TOC entry 277 (class 1259 OID 76461)
-- Name: nomina_tabla_legal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nomina_tabla_legal (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    concepto_id bigint NOT NULL,
    porcentaje_empleado numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    porcentaje_empresa numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    vigente_desde date NOT NULL,
    vigente_hasta date,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 276 (class 1259 OID 76460)
-- Name: nomina_tabla_legal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_tabla_legal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4615 (class 0 OID 0)
-- Dependencies: 276
-- Name: nomina_tabla_legal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_tabla_legal_id_seq OWNED BY public.nomina_tabla_legal.id;


--
-- TOC entry 279 (class 1259 OID 76481)
-- Name: nominas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nominas (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    mes integer NOT NULL,
    anio integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    total_fijos numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    total_variables numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    total_bonificaciones numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    total_deducciones numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    total_general numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    estado character varying(255) DEFAULT 'BORRADOR'::character varying NOT NULL,
    cerrada_por bigint,
    cerrada_at timestamp(0) without time zone,
    observacion text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    quincena smallint,
    tipo_pago_snapshot character varying(255) DEFAULT 'QUINCENAL'::character varying NOT NULL,
    CONSTRAINT nominas_estado_check CHECK (((estado)::text = ANY ((ARRAY['BORRADOR'::character varying, 'CERRADA'::character varying])::text[]))),
    CONSTRAINT nominas_tipo_pago_snapshot_check CHECK (((tipo_pago_snapshot)::text = ANY ((ARRAY['QUINCENAL'::character varying, 'MENSUAL'::character varying])::text[])))
);


--
-- TOC entry 278 (class 1259 OID 76480)
-- Name: nominas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nominas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4618 (class 0 OID 0)
-- Dependencies: 278
-- Name: nominas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nominas_id_seq OWNED BY public.nominas.id;


--
-- TOC entry 316 (class 1259 OID 76913)
-- Name: operaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operaciones (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    fecha date NOT NULL,
    hora_inicio time(0) without time zone,
    hora_fin time(0) without time zone,
    estado character varying(255) DEFAULT 'BORRADOR'::character varying NOT NULL,
    hubo_lluvia boolean DEFAULT false NOT NULL,
    observaciones character varying(500),
    creado_por bigint,
    aprobado_por bigint,
    aprobado_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    cantidad_lluvia numeric(6,2),
    CONSTRAINT operaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['BORRADOR'::character varying, 'APROBADA'::character varying])::text[])))
);


--
-- TOC entry 315 (class 1259 OID 76912)
-- Name: operaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4621 (class 0 OID 0)
-- Dependencies: 315
-- Name: operaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operaciones_id_seq OWNED BY public.operaciones.id;


--
-- TOC entry 249 (class 1259 OID 76111)
-- Name: palmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.palmas (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    sublote_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    descripcion character varying(50),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    linea_id bigint
);


--
-- TOC entry 248 (class 1259 OID 76110)
-- Name: palmas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.palmas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4624 (class 0 OID 0)
-- Dependencies: 248
-- Name: palmas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.palmas_id_seq OWNED BY public.palmas.id;


--
-- TOC entry 221 (class 1259 OID 75858)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- TOC entry 297 (class 1259 OID 76759)
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 296 (class 1259 OID 76758)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4628 (class 0 OID 0)
-- Dependencies: 296
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 257 (class 1259 OID 76186)
-- Name: precio_abono; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.precio_abono (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    gramos_min numeric(10,2) NOT NULL,
    gramos_max numeric(10,2) NOT NULL,
    precio_palma numeric(10,2) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 256 (class 1259 OID 76185)
-- Name: precio_abono_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precio_abono_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4631 (class 0 OID 0)
-- Dependencies: 256
-- Name: precio_abono_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precio_abono_id_seq OWNED BY public.precio_abono.id;


--
-- TOC entry 253 (class 1259 OID 76152)
-- Name: precio_cosecha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.precio_cosecha (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lote_id bigint NOT NULL,
    precio numeric(10,2) NOT NULL,
    anio integer NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 252 (class 1259 OID 76151)
-- Name: precio_cosecha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precio_cosecha_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4634 (class 0 OID 0)
-- Dependencies: 252
-- Name: precio_cosecha_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precio_cosecha_id_seq OWNED BY public.precio_cosecha.id;


--
-- TOC entry 328 (class 1259 OID 77183)
-- Name: precios_palma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.precios_palma (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    tipo character varying(255) NOT NULL,
    precio_palma numeric(12,2),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT precios_palma_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['PLATEO'::character varying, 'PODA'::character varying, 'SANIDAD'::character varying, 'OTROS'::character varying])::text[])))
);


--
-- TOC entry 327 (class 1259 OID 77182)
-- Name: precios_palma_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precios_palma_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4637 (class 0 OID 0)
-- Dependencies: 327
-- Name: precios_palma_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precios_palma_id_seq OWNED BY public.precios_palma.id;


--
-- TOC entry 237 (class 1259 OID 75997)
-- Name: predios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predios (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    ubicacion character varying(100) NOT NULL,
    latitud numeric(10,7),
    longitud numeric(10,7),
    hectareas_totales numeric(10,2),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 236 (class 1259 OID 75996)
-- Name: predios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.predios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4640 (class 0 OID 0)
-- Dependencies: 236
-- Name: predios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.predios_id_seq OWNED BY public.predios.id;


--
-- TOC entry 251 (class 1259 OID 76132)
-- Name: promedio_lote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promedio_lote (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lote_id bigint NOT NULL,
    promedio numeric(10,2) NOT NULL,
    anio integer NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 250 (class 1259 OID 76131)
-- Name: promedio_lote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promedio_lote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4643 (class 0 OID 0)
-- Dependencies: 250
-- Name: promedio_lote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promedio_lote_id_seq OWNED BY public.promedio_lote.id;


--
-- TOC entry 312 (class 1259 OID 76881)
-- Name: pulse_aggregates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pulse_aggregates (
    id bigint NOT NULL,
    bucket integer NOT NULL,
    period integer NOT NULL,
    type character varying(255) NOT NULL,
    key text NOT NULL,
    key_hash uuid GENERATED ALWAYS AS ((md5(key))::uuid) STORED NOT NULL,
    aggregate character varying(255) NOT NULL,
    value numeric(20,2) NOT NULL,
    count integer
);


--
-- TOC entry 311 (class 1259 OID 76880)
-- Name: pulse_aggregates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pulse_aggregates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4646 (class 0 OID 0)
-- Dependencies: 311
-- Name: pulse_aggregates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pulse_aggregates_id_seq OWNED BY public.pulse_aggregates.id;


--
-- TOC entry 310 (class 1259 OID 76867)
-- Name: pulse_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pulse_entries (
    id bigint NOT NULL,
    "timestamp" integer NOT NULL,
    type character varying(255) NOT NULL,
    key text NOT NULL,
    key_hash uuid GENERATED ALWAYS AS ((md5(key))::uuid) STORED NOT NULL,
    value bigint
);


--
-- TOC entry 309 (class 1259 OID 76866)
-- Name: pulse_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pulse_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4649 (class 0 OID 0)
-- Dependencies: 309
-- Name: pulse_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pulse_entries_id_seq OWNED BY public.pulse_entries.id;


--
-- TOC entry 308 (class 1259 OID 76853)
-- Name: pulse_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pulse_values (
    id bigint NOT NULL,
    "timestamp" integer NOT NULL,
    type character varying(255) NOT NULL,
    key text NOT NULL,
    key_hash uuid GENERATED ALWAYS AS ((md5(key))::uuid) STORED NOT NULL,
    value text NOT NULL
);


--
-- TOC entry 307 (class 1259 OID 76852)
-- Name: pulse_values_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pulse_values_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4652 (class 0 OID 0)
-- Dependencies: 307
-- Name: pulse_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pulse_values_id_seq OWNED BY public.pulse_values.id;


--
-- TOC entry 269 (class 1259 OID 76354)
-- Name: registro_cosecha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registro_cosecha (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lote_id bigint NOT NULL,
    sublote_id bigint NOT NULL,
    gajos_reportados integer NOT NULL,
    gajos_reconteo integer,
    peso_confirmado numeric(10,2),
    precio_cosecha numeric(10,2),
    promedio_kg_gajo numeric(10,2),
    valor_total numeric(10,2),
    sync_uuid uuid,
    sync_estado character varying(255) DEFAULT 'SINCRONIZADO'::character varying NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    operacion_id bigint NOT NULL,
    CONSTRAINT registro_cosecha_sync_estado_check CHECK (((sync_estado)::text = ANY ((ARRAY['LOCAL'::character varying, 'SINCRONIZADO'::character varying])::text[])))
);


--
-- TOC entry 268 (class 1259 OID 76353)
-- Name: registro_cosecha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registro_cosecha_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4655 (class 0 OID 0)
-- Dependencies: 268
-- Name: registro_cosecha_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registro_cosecha_id_seq OWNED BY public.registro_cosecha.id;


--
-- TOC entry 302 (class 1259 OID 76805)
-- Name: role_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_has_permissions (
    permission_id bigint NOT NULL,
    role_id bigint NOT NULL
);


--
-- TOC entry 299 (class 1259 OID 76770)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    tenant_id bigint,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 298 (class 1259 OID 76769)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4659 (class 0 OID 0)
-- Dependencies: 298
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 243 (class 1259 OID 76045)
-- Name: semilla_lote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.semilla_lote (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lote_id bigint NOT NULL,
    semilla_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 242 (class 1259 OID 76044)
-- Name: semilla_lote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.semilla_lote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4662 (class 0 OID 0)
-- Dependencies: 242
-- Name: semilla_lote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.semilla_lote_id_seq OWNED BY public.semilla_lote.id;


--
-- TOC entry 239 (class 1259 OID 76011)
-- Name: semillas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.semillas (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    tipo character varying(50) NOT NULL,
    nombre character varying(50) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 238 (class 1259 OID 76010)
-- Name: semillas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.semillas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4665 (class 0 OID 0)
-- Dependencies: 238
-- Name: semillas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.semillas_id_seq OWNED BY public.semillas.id;


--
-- TOC entry 222 (class 1259 OID 75865)
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- TOC entry 245 (class 1259 OID 76070)
-- Name: sublotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sublotes (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lote_id bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    cantidad_palmas integer NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 244 (class 1259 OID 76069)
-- Name: sublotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sublotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4669 (class 0 OID 0)
-- Dependencies: 244
-- Name: sublotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sublotes_id_seq OWNED BY public.sublotes.id;


--
-- TOC entry 304 (class 1259 OID 76821)
-- Name: telescope_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_entries (
    sequence bigint NOT NULL,
    uuid uuid NOT NULL,
    batch_id uuid NOT NULL,
    family_hash character varying(255),
    should_display_on_index boolean DEFAULT true NOT NULL,
    type character varying(20) NOT NULL,
    content text NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- TOC entry 303 (class 1259 OID 76820)
-- Name: telescope_entries_sequence_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telescope_entries_sequence_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4672 (class 0 OID 0)
-- Dependencies: 303
-- Name: telescope_entries_sequence_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telescope_entries_sequence_seq OWNED BY public.telescope_entries.sequence;


--
-- TOC entry 305 (class 1259 OID 76836)
-- Name: telescope_entries_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_entries_tags (
    entry_uuid uuid NOT NULL,
    tag character varying(255) NOT NULL
);


--
-- TOC entry 306 (class 1259 OID 76847)
-- Name: telescope_monitoring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_monitoring (
    tag character varying(255) NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 75891)
-- Name: tenant_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_config (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    tipo_pago_nomina character varying(255) DEFAULT 'QUINCENAL'::character varying NOT NULL,
    moneda character varying(3) DEFAULT 'COP'::character varying NOT NULL,
    zona_horaria character varying(50) DEFAULT 'America/Bogota'::character varying NOT NULL,
    pais character varying(2) DEFAULT 'CO'::character varying NOT NULL,
    salario_minimo_vigente numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    auxilio_transporte numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    sync_habilitado boolean DEFAULT true NOT NULL,
    configuracion_extra jsonb,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    modulo_dashboard boolean DEFAULT true NOT NULL,
    modulo_plantacion boolean DEFAULT true NOT NULL,
    modulo_colaboradores boolean DEFAULT true NOT NULL,
    modulo_nomina boolean DEFAULT true NOT NULL,
    modulo_operaciones boolean DEFAULT true NOT NULL,
    modulo_viajes boolean DEFAULT true NOT NULL,
    modulo_usuarios boolean DEFAULT true NOT NULL,
    modulo_configuracion boolean DEFAULT true NOT NULL,
    divisor_jornada_mensual smallint DEFAULT '240'::smallint NOT NULL,
    CONSTRAINT tenant_config_tipo_pago_nomina_check CHECK (((tipo_pago_nomina)::text = ANY ((ARRAY['QUINCENAL'::character varying, 'MENSUAL'::character varying])::text[])))
);


--
-- TOC entry 225 (class 1259 OID 75890)
-- Name: tenant_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4677 (class 0 OID 0)
-- Dependencies: 225
-- Name: tenant_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_config_id_seq OWNED BY public.tenant_config.id;


--
-- TOC entry 233 (class 1259 OID 75953)
-- Name: tenant_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_user (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    rol character varying(30) DEFAULT 'USUARIO'::character varying NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 232 (class 1259 OID 75952)
-- Name: tenant_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4680 (class 0 OID 0)
-- Dependencies: 232
-- Name: tenant_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_user_id_seq OWNED BY public.tenant_user.id;


--
-- TOC entry 218 (class 1259 OID 75832)
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo_persona character varying(255) NOT NULL,
    nit character varying(20),
    razon_social character varying(200),
    correo_contacto character varying(100),
    telefono character varying(20),
    direccion character varying(200),
    departamento character varying(100),
    municipio character varying(100),
    logo_url character varying(500),
    estado character varying(255) DEFAULT 'ACTIVO'::character varying NOT NULL,
    fecha_activacion date,
    fecha_suspension date,
    plan character varying(255) DEFAULT 'BASICO'::character varying NOT NULL,
    max_empleados integer,
    max_usuarios integer,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT tenants_estado_check CHECK (((estado)::text = ANY ((ARRAY['ACTIVO'::character varying, 'INACTIVO'::character varying, 'SUSPENDIDO'::character varying])::text[]))),
    CONSTRAINT tenants_plan_check CHECK (((plan)::text = ANY ((ARRAY['BASICO'::character varying, 'PROFESIONAL'::character varying, 'ENTERPRISE'::character varying])::text[]))),
    CONSTRAINT tenants_tipo_persona_check CHECK (((tipo_persona)::text = ANY ((ARRAY['NATURAL'::character varying, 'JURIDICA'::character varying])::text[])))
);


--
-- TOC entry 217 (class 1259 OID 75831)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4683 (class 0 OID 0)
-- Dependencies: 217
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- TOC entry 340 (class 1259 OID 77391)
-- Name: tipos_hora_extra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_hora_extra (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    porcentaje_recargo numeric(5,2) NOT NULL,
    franja_horaria character varying(20) NOT NULL,
    aplica_festivo boolean DEFAULT false NOT NULL,
    es_extra boolean DEFAULT true NOT NULL,
    paga_hora_completa boolean DEFAULT true NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT tipos_hora_extra_codigo_check CHECK (((codigo)::text = ANY ((ARRAY['HED'::character varying, 'HEN'::character varying, 'RN'::character varying, 'HRD'::character varying, 'HEDF'::character varying, 'HENF'::character varying, 'RND'::character varying])::text[]))),
    CONSTRAINT tipos_hora_extra_franja_horaria_check CHECK (((franja_horaria)::text = ANY ((ARRAY['DIURNO'::character varying, 'NOCTURNO'::character varying, 'MIXTO'::character varying])::text[])))
);


--
-- TOC entry 339 (class 1259 OID 77390)
-- Name: tipos_hora_extra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_hora_extra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4686 (class 0 OID 0)
-- Dependencies: 339
-- Name: tipos_hora_extra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_hora_extra_id_seq OWNED BY public.tipos_hora_extra.id;


--
-- TOC entry 336 (class 1259 OID 77304)
-- Name: transportadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transportadores (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    empresa_transportadora_id bigint NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    placa_vehiculo character varying(20) NOT NULL,
    tipo_documento character varying(15),
    numero_documento character varying(30),
    telefono character varying(30),
    licencia_conduccion character varying(30),
    licencia_vencimiento date,
    tipo_vehiculo character varying(50),
    capacidad_kg numeric(10,2),
    observaciones text,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 335 (class 1259 OID 77303)
-- Name: transportadores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transportadores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4689 (class 0 OID 0)
-- Dependencies: 335
-- Name: transportadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transportadores_id_seq OWNED BY public.transportadores.id;


--
-- TOC entry 220 (class 1259 OID 75848)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    is_super_admin boolean DEFAULT false NOT NULL,
    status boolean DEFAULT true NOT NULL
);


--
-- TOC entry 219 (class 1259 OID 75847)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4692 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 291 (class 1259 OID 76665)
-- Name: vacacion_acumulado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vacacion_acumulado (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    dias_generados numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    dias_tomados numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    dias_pagados numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    dias_disponibles numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    fecha_corte date NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 290 (class 1259 OID 76664)
-- Name: vacacion_acumulado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vacacion_acumulado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4695 (class 0 OID 0)
-- Dependencies: 290
-- Name: vacacion_acumulado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vacacion_acumulado_id_seq OWNED BY public.vacacion_acumulado.id;


--
-- TOC entry 289 (class 1259 OID 76628)
-- Name: vacaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vacaciones (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    empleado_id bigint NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    dias_habiles integer DEFAULT 0 NOT NULL,
    dias_calendario integer DEFAULT 0 NOT NULL,
    valor_dia numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_pagado numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    estado character varying(255) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    aprobado_por bigint,
    nomina_id bigint,
    observacion text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT vacaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying, 'PAGADA'::character varying, 'CANCELADA'::character varying])::text[])))
);


--
-- TOC entry 288 (class 1259 OID 76627)
-- Name: vacaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vacaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4698 (class 0 OID 0)
-- Dependencies: 288
-- Name: vacaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vacaciones_id_seq OWNED BY public.vacaciones.id;


--
-- TOC entry 271 (class 1259 OID 76383)
-- Name: viaje_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viaje_detalle (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    viaje_id bigint NOT NULL,
    cosecha_id bigint NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    reconteo_aprobado boolean DEFAULT false NOT NULL,
    reconteo_aprobado_at timestamp(0) without time zone,
    reconteo_aprobado_por bigint
);


--
-- TOC entry 270 (class 1259 OID 76382)
-- Name: viaje_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viaje_detalle_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4701 (class 0 OID 0)
-- Dependencies: 270
-- Name: viaje_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viaje_detalle_id_seq OWNED BY public.viaje_detalle.id;


--
-- TOC entry 346 (class 1259 OID 77495)
-- Name: viaje_documento_bascula; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viaje_documento_bascula (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    viaje_id bigint NOT NULL,
    archivo_path character varying(500) NOT NULL,
    archivo_nombre_original character varying(255) NOT NULL,
    mime_type character varying(50) NOT NULL,
    archivo_tamano integer NOT NULL,
    estado_ocr character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    peso_extraido numeric(10,2),
    confianza numeric(4,3),
    modelo_usado character varying(50),
    respuesta_claude jsonb,
    error_mensaje text,
    intentos smallint DEFAULT '0'::smallint NOT NULL,
    procesado_at timestamp(0) without time zone,
    creado_por bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    datos_extraidos jsonb,
    CONSTRAINT viaje_documento_bascula_estado_ocr_check CHECK (((estado_ocr)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'PROCESANDO'::character varying, 'COMPLETADO'::character varying, 'REVISION_MANUAL'::character varying, 'FALLIDO'::character varying])::text[])))
);


--
-- TOC entry 345 (class 1259 OID 77494)
-- Name: viaje_documento_bascula_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viaje_documento_bascula_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4704 (class 0 OID 0)
-- Dependencies: 345
-- Name: viaje_documento_bascula_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viaje_documento_bascula_id_seq OWNED BY public.viaje_documento_bascula.id;


--
-- TOC entry 267 (class 1259 OID 76332)
-- Name: viajes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viajes (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    placa_vehiculo character varying(20) NOT NULL,
    nombre_conductor character varying(100),
    fecha_viaje date NOT NULL,
    peso_viaje numeric(10,2),
    cantidad_gajos_total integer,
    observaciones character varying(255),
    es_homogeneo boolean DEFAULT true NOT NULL,
    sync_uuid uuid,
    sync_estado character varying(255) DEFAULT 'SINCRONIZADO'::character varying NOT NULL,
    estado_activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    empresa_transportadora_id bigint,
    transportador_id bigint,
    extractora_id bigint,
    remision character varying(30),
    hora_salida time(0) without time zone,
    despachado_at timestamp(0) without time zone,
    llegada_planta_at timestamp(0) without time zone,
    finalizado_at timestamp(0) without time zone,
    creado_por bigint,
    estado character varying(20) DEFAULT 'CREADO'::character varying NOT NULL,
    validacion_at timestamp(0) without time zone,
    numero_remision_extractora character varying(50),
    fecha_llegada date,
    hora_llegada time(0) without time zone,
    racimos_recibidos integer,
    temperatura_pulpa numeric(5,2),
    acidez_inicial numeric(5,2),
    humedad_semilla numeric(5,2),
    calidad_materia_prima character varying(20),
    observaciones_extractora character varying(500),
    CONSTRAINT viajes_estado_check CHECK (((estado)::text = ANY ((ARRAY['CREADO'::character varying, 'EN_VALIDACION'::character varying, 'FINALIZADO'::character varying])::text[]))),
    CONSTRAINT viajes_sync_estado_check CHECK (((sync_estado)::text = ANY ((ARRAY['LOCAL'::character varying, 'SINCRONIZADO'::character varying])::text[])))
);


--
-- TOC entry 266 (class 1259 OID 76331)
-- Name: viajes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viajes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4707 (class 0 OID 0)
-- Dependencies: 266
-- Name: viajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viajes_id_seq OWNED BY public.viajes.id;


--
-- TOC entry 3791 (class 2604 OID 77156)
-- Name: agro_chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages ALTER COLUMN id SET DEFAULT nextval('public.agro_chat_messages_id_seq'::regclass);


--
-- TOC entry 3789 (class 2604 OID 77137)
-- Name: agro_chat_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions ALTER COLUMN id SET DEFAULT nextval('public.agro_chat_sessions_id_seq'::regclass);


--
-- TOC entry 3827 (class 2604 OID 77559)
-- Name: arl id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl ALTER COLUMN id SET DEFAULT nextval('public.arl_id_seq'::regclass);


--
-- TOC entry 3647 (class 2604 OID 75978)
-- Name: auditorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias ALTER COLUMN id SET DEFAULT nextval('public.auditorias_id_seq'::regclass);


--
-- TOC entry 3781 (class 2604 OID 77046)
-- Name: ausencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias ALTER COLUMN id SET DEFAULT nextval('public.ausencias_id_seq'::regclass);


--
-- TOC entry 3673 (class 2604 OID 76245)
-- Name: cargos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos ALTER COLUMN id SET DEFAULT nextval('public.cargos_id_seq'::regclass);


--
-- TOC entry 3690 (class 2604 OID 76411)
-- Name: cosecha_cuadrilla id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla ALTER COLUMN id SET DEFAULT nextval('public.cosecha_cuadrilla_id_seq'::regclass);


--
-- TOC entry 3776 (class 2604 OID 76983)
-- Name: empleado_contratos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos ALTER COLUMN id SET DEFAULT nextval('public.empleado_contratos_id_seq'::regclass);


--
-- TOC entry 3779 (class 2604 OID 77018)
-- Name: empleado_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos ALTER COLUMN id SET DEFAULT nextval('public.empleado_documentos_id_seq'::regclass);


--
-- TOC entry 3675 (class 2604 OID 76265)
-- Name: empleados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados ALTER COLUMN id SET DEFAULT nextval('public.empleados_id_seq'::regclass);


--
-- TOC entry 3804 (class 2604 OID 77289)
-- Name: empresa_transportadora id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora ALTER COLUMN id SET DEFAULT nextval('public.empresa_transportadora_id_seq'::regclass);


--
-- TOC entry 3829 (class 2604 OID 77575)
-- Name: entidades_bancarias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias ALTER COLUMN id SET DEFAULT nextval('public.entidades_bancarias_id_seq'::regclass);


--
-- TOC entry 3823 (class 2604 OID 77527)
-- Name: eps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps ALTER COLUMN id SET DEFAULT nextval('public.eps_id_seq'::regclass);


--
-- TOC entry 3808 (class 2604 OID 77331)
-- Name: extractoras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras ALTER COLUMN id SET DEFAULT nextval('public.extractoras_id_seq'::regclass);


--
-- TOC entry 3642 (class 2604 OID 75942)
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- TOC entry 3825 (class 2604 OID 77543)
-- Name: fondos_pension id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension ALTER COLUMN id SET DEFAULT nextval('public.fondos_pension_id_seq'::regclass);


--
-- TOC entry 3815 (class 2604 OID 77415)
-- Name: horas_extra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra ALTER COLUMN id SET DEFAULT nextval('public.horas_extra_id_seq'::regclass);


--
-- TOC entry 3664 (class 2604 OID 76175)
-- Name: insumos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos ALTER COLUMN id SET DEFAULT nextval('public.insumos_id_seq'::regclass);


--
-- TOC entry 3641 (class 2604 OID 75925)
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- TOC entry 3795 (class 2604 OID 77203)
-- Name: jornales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales ALTER COLUMN id SET DEFAULT nextval('public.jornales_id_seq'::regclass);


--
-- TOC entry 3668 (class 2604 OID 76208)
-- Name: labores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores ALTER COLUMN id SET DEFAULT nextval('public.labores_id_seq'::regclass);


--
-- TOC entry 3657 (class 2604 OID 76092)
-- Name: lineas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas ALTER COLUMN id SET DEFAULT nextval('public.lineas_id_seq'::regclass);


--
-- TOC entry 3760 (class 2604 OID 76733)
-- Name: liquidacion_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle ALTER COLUMN id SET DEFAULT nextval('public.liquidacion_detalle_id_seq'::regclass);


--
-- TOC entry 3744 (class 2604 OID 76690)
-- Name: liquidaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones ALTER COLUMN id SET DEFAULT nextval('public.liquidaciones_id_seq'::regclass);


--
-- TOC entry 3652 (class 2604 OID 76028)
-- Name: lotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes ALTER COLUMN id SET DEFAULT nextval('public.lotes_id_seq'::regclass);


--
-- TOC entry 3617 (class 2604 OID 51704)
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- TOC entry 3671 (class 2604 OID 76231)
-- Name: modalidad_contrato id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modalidad_contrato ALTER COLUMN id SET DEFAULT nextval('public.modalidad_contrato_id_seq'::regclass);


--
-- TOC entry 3798 (class 2604 OID 77262)
-- Name: motivos_ausencia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia ALTER COLUMN id SET DEFAULT nextval('public.motivos_ausencia_id_seq'::regclass);


--
-- TOC entry 3692 (class 2604 OID 76436)
-- Name: nomina_concepto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto ALTER COLUMN id SET DEFAULT nextval('public.nomina_concepto_id_seq'::regclass);


--
-- TOC entry 3731 (class 2604 OID 76605)
-- Name: nomina_cosecha_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref ALTER COLUMN id SET DEFAULT nextval('public.nomina_cosecha_ref_id_seq'::regclass);


--
-- TOC entry 3709 (class 2604 OID 76513)
-- Name: nomina_empleado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado ALTER COLUMN id SET DEFAULT nextval('public.nomina_empleado_id_seq'::regclass);


--
-- TOC entry 3726 (class 2604 OID 76551)
-- Name: nomina_empleado_concepto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto ALTER COLUMN id SET DEFAULT nextval('public.nomina_empleado_concepto_id_seq'::regclass);


--
-- TOC entry 3818 (class 2604 OID 77471)
-- Name: nomina_hora_extra_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref ALTER COLUMN id SET DEFAULT nextval('public.nomina_hora_extra_ref_id_seq'::regclass);


--
-- TOC entry 3729 (class 2604 OID 76579)
-- Name: nomina_jornal_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref ALTER COLUMN id SET DEFAULT nextval('public.nomina_jornal_ref_id_seq'::regclass);


--
-- TOC entry 3698 (class 2604 OID 76464)
-- Name: nomina_tabla_legal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal ALTER COLUMN id SET DEFAULT nextval('public.nomina_tabla_legal_id_seq'::regclass);


--
-- TOC entry 3701 (class 2604 OID 76484)
-- Name: nominas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas ALTER COLUMN id SET DEFAULT nextval('public.nominas_id_seq'::regclass);


--
-- TOC entry 3773 (class 2604 OID 76916)
-- Name: operaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones ALTER COLUMN id SET DEFAULT nextval('public.operaciones_id_seq'::regclass);


--
-- TOC entry 3660 (class 2604 OID 76114)
-- Name: palmas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas ALTER COLUMN id SET DEFAULT nextval('public.palmas_id_seq'::regclass);


--
-- TOC entry 3763 (class 2604 OID 76762)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 3666 (class 2604 OID 76189)
-- Name: precio_abono id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_abono ALTER COLUMN id SET DEFAULT nextval('public.precio_abono_id_seq'::regclass);


--
-- TOC entry 3663 (class 2604 OID 76155)
-- Name: precio_cosecha id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha ALTER COLUMN id SET DEFAULT nextval('public.precio_cosecha_id_seq'::regclass);


--
-- TOC entry 3793 (class 2604 OID 77186)
-- Name: precios_palma id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma ALTER COLUMN id SET DEFAULT nextval('public.precios_palma_id_seq'::regclass);


--
-- TOC entry 3648 (class 2604 OID 76000)
-- Name: predios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios ALTER COLUMN id SET DEFAULT nextval('public.predios_id_seq'::regclass);


--
-- TOC entry 3662 (class 2604 OID 76135)
-- Name: promedio_lote id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote ALTER COLUMN id SET DEFAULT nextval('public.promedio_lote_id_seq'::regclass);


--
-- TOC entry 3771 (class 2604 OID 76884)
-- Name: pulse_aggregates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_aggregates ALTER COLUMN id SET DEFAULT nextval('public.pulse_aggregates_id_seq'::regclass);


--
-- TOC entry 3769 (class 2604 OID 76870)
-- Name: pulse_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_entries ALTER COLUMN id SET DEFAULT nextval('public.pulse_entries_id_seq'::regclass);


--
-- TOC entry 3767 (class 2604 OID 76856)
-- Name: pulse_values id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_values ALTER COLUMN id SET DEFAULT nextval('public.pulse_values_id_seq'::regclass);


--
-- TOC entry 3684 (class 2604 OID 76357)
-- Name: registro_cosecha id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha ALTER COLUMN id SET DEFAULT nextval('public.registro_cosecha_id_seq'::regclass);


--
-- TOC entry 3764 (class 2604 OID 76773)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3654 (class 2604 OID 76048)
-- Name: semilla_lote id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote ALTER COLUMN id SET DEFAULT nextval('public.semilla_lote_id_seq'::regclass);


--
-- TOC entry 3650 (class 2604 OID 76014)
-- Name: semillas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semillas ALTER COLUMN id SET DEFAULT nextval('public.semillas_id_seq'::regclass);


--
-- TOC entry 3655 (class 2604 OID 76073)
-- Name: sublotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes ALTER COLUMN id SET DEFAULT nextval('public.sublotes_id_seq'::regclass);


--
-- TOC entry 3765 (class 2604 OID 76824)
-- Name: telescope_entries sequence; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries ALTER COLUMN sequence SET DEFAULT nextval('public.telescope_entries_sequence_seq'::regclass);


--
-- TOC entry 3624 (class 2604 OID 75894)
-- Name: tenant_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config ALTER COLUMN id SET DEFAULT nextval('public.tenant_config_id_seq'::regclass);


--
-- TOC entry 3644 (class 2604 OID 75956)
-- Name: tenant_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user ALTER COLUMN id SET DEFAULT nextval('public.tenant_user_id_seq'::regclass);


--
-- TOC entry 3618 (class 2604 OID 75835)
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- TOC entry 3810 (class 2604 OID 77394)
-- Name: tipos_hora_extra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra ALTER COLUMN id SET DEFAULT nextval('public.tipos_hora_extra_id_seq'::regclass);


--
-- TOC entry 3806 (class 2604 OID 77307)
-- Name: transportadores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores ALTER COLUMN id SET DEFAULT nextval('public.transportadores_id_seq'::regclass);


--
-- TOC entry 3621 (class 2604 OID 75851)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3739 (class 2604 OID 76668)
-- Name: vacacion_acumulado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado ALTER COLUMN id SET DEFAULT nextval('public.vacacion_acumulado_id_seq'::regclass);


--
-- TOC entry 3733 (class 2604 OID 76631)
-- Name: vacaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones ALTER COLUMN id SET DEFAULT nextval('public.vacaciones_id_seq'::regclass);


--
-- TOC entry 3687 (class 2604 OID 76386)
-- Name: viaje_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle ALTER COLUMN id SET DEFAULT nextval('public.viaje_detalle_id_seq'::regclass);


--
-- TOC entry 3820 (class 2604 OID 77498)
-- Name: viaje_documento_bascula id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula ALTER COLUMN id SET DEFAULT nextval('public.viaje_documento_bascula_id_seq'::regclass);


--
-- TOC entry 3679 (class 2604 OID 76335)
-- Name: viajes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes ALTER COLUMN id SET DEFAULT nextval('public.viajes_id_seq'::regclass);


--
-- TOC entry 4142 (class 2606 OID 77161)
-- Name: agro_chat_messages agro_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4139 (class 2606 OID 77140)
-- Name: agro_chat_sessions agro_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions
    ADD CONSTRAINT agro_chat_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4211 (class 2606 OID 77562)
-- Name: arl arl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl
    ADD CONSTRAINT arl_pkey PRIMARY KEY (id);


--
-- TOC entry 4214 (class 2606 OID 77569)
-- Name: arl arl_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl
    ADD CONSTRAINT arl_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 3915 (class 2606 OID 75982)
-- Name: auditorias auditorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_pkey PRIMARY KEY (id);


--
-- TOC entry 4129 (class 2606 OID 77059)
-- Name: ausencias ausencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_pkey PRIMARY KEY (id);


--
-- TOC entry 4131 (class 2606 OID 77096)
-- Name: ausencias ausencias_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 3893 (class 2606 OID 75888)
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- TOC entry 3890 (class 2606 OID 75880)
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- TOC entry 3973 (class 2606 OID 76249)
-- Name: cargos cargos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_pkey PRIMARY KEY (id);


--
-- TOC entry 4005 (class 2606 OID 76414)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_pkey PRIMARY KEY (id);


--
-- TOC entry 4108 (class 2606 OID 76900)
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (codigo);


--
-- TOC entry 4119 (class 2606 OID 76990)
-- Name: empleado_contratos empleado_contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos
    ADD CONSTRAINT empleado_contratos_pkey PRIMARY KEY (id);


--
-- TOC entry 4124 (class 2606 OID 77023)
-- Name: empleado_documentos empleado_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_pkey PRIMARY KEY (id);


--
-- TOC entry 3976 (class 2606 OID 76273)
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id);


--
-- TOC entry 4163 (class 2606 OID 77294)
-- Name: empresa_transportadora empresa_transportadora_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora
    ADD CONSTRAINT empresa_transportadora_pkey PRIMARY KEY (id);


--
-- TOC entry 4166 (class 2606 OID 77301)
-- Name: empresa_transportadora empresa_transportadora_tenant_id_nit_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora
    ADD CONSTRAINT empresa_transportadora_tenant_id_nit_unique UNIQUE (tenant_id, nit);


--
-- TOC entry 4216 (class 2606 OID 77578)
-- Name: entidades_bancarias entidades_bancarias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias
    ADD CONSTRAINT entidades_bancarias_pkey PRIMARY KEY (id);


--
-- TOC entry 4219 (class 2606 OID 77585)
-- Name: entidades_bancarias entidades_bancarias_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias
    ADD CONSTRAINT entidades_bancarias_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4201 (class 2606 OID 77530)
-- Name: eps eps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps
    ADD CONSTRAINT eps_pkey PRIMARY KEY (id);


--
-- TOC entry 4204 (class 2606 OID 77537)
-- Name: eps eps_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps
    ADD CONSTRAINT eps_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4174 (class 2606 OID 77336)
-- Name: extractoras extractoras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_pkey PRIMARY KEY (id);


--
-- TOC entry 4177 (class 2606 OID 77353)
-- Name: extractoras extractoras_tenant_id_nit_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_tenant_id_nit_unique UNIQUE (tenant_id, nit);


--
-- TOC entry 3904 (class 2606 OID 75947)
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 3906 (class 2606 OID 75949)
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- TOC entry 4206 (class 2606 OID 77546)
-- Name: fondos_pension fondos_pension_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension
    ADD CONSTRAINT fondos_pension_pkey PRIMARY KEY (id);


--
-- TOC entry 4209 (class 2606 OID 77553)
-- Name: fondos_pension fondos_pension_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension
    ADD CONSTRAINT fondos_pension_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4184 (class 2606 OID 77423)
-- Name: horas_extra horas_extra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_pkey PRIMARY KEY (id);


--
-- TOC entry 4186 (class 2606 OID 77464)
-- Name: horas_extra horas_extra_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 3957 (class 2606 OID 76178)
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- TOC entry 3960 (class 2606 OID 77589)
-- Name: insumos insumos_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 3902 (class 2606 OID 75937)
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 3899 (class 2606 OID 75929)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4151 (class 2606 OID 77212)
-- Name: jornales jornales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_pkey PRIMARY KEY (id);


--
-- TOC entry 4153 (class 2606 OID 77252)
-- Name: jornales jornales_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 3965 (class 2606 OID 76215)
-- Name: labores labores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores
    ADD CONSTRAINT labores_pkey PRIMARY KEY (id);


--
-- TOC entry 3968 (class 2606 OID 77181)
-- Name: labores labores_tenant_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores
    ADD CONSTRAINT labores_tenant_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 3936 (class 2606 OID 76096)
-- Name: lineas lineas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_pkey PRIMARY KEY (id);


--
-- TOC entry 3938 (class 2606 OID 76109)
-- Name: lineas lineas_sublote_id_numero_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_sublote_id_numero_unique UNIQUE (sublote_id, numero);


--
-- TOC entry 4053 (class 2606 OID 76741)
-- Name: liquidacion_detalle liquidacion_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_pkey PRIMARY KEY (id);


--
-- TOC entry 4049 (class 2606 OID 76711)
-- Name: liquidaciones liquidaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 3924 (class 2606 OID 76031)
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- TOC entry 3873 (class 2606 OID 51706)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3970 (class 2606 OID 76234)
-- Name: modalidad_contrato modalidad_contrato_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modalidad_contrato
    ADD CONSTRAINT modalidad_contrato_pkey PRIMARY KEY (id);


--
-- TOC entry 4066 (class 2606 OID 76792)
-- Name: model_has_permissions model_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_pkey PRIMARY KEY (tenant_id, permission_id, model_id, model_type);


--
-- TOC entry 4070 (class 2606 OID 76804)
-- Name: model_has_roles model_has_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_pkey PRIMARY KEY (tenant_id, role_id, model_id, model_type);


--
-- TOC entry 4158 (class 2606 OID 77269)
-- Name: motivos_ausencia motivos_ausencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia
    ADD CONSTRAINT motivos_ausencia_pkey PRIMARY KEY (id);


--
-- TOC entry 4161 (class 2606 OID 77276)
-- Name: motivos_ausencia motivos_ausencia_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia
    ADD CONSTRAINT motivos_ausencia_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4111 (class 2606 OID 76911)
-- Name: municipios municipios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_pkey PRIMARY KEY (codigo);


--
-- TOC entry 4009 (class 2606 OID 76451)
-- Name: nomina_concepto nomina_concepto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto
    ADD CONSTRAINT nomina_concepto_pkey PRIMARY KEY (id);


--
-- TOC entry 4012 (class 2606 OID 76458)
-- Name: nomina_concepto nomina_concepto_tenant_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto
    ADD CONSTRAINT nomina_concepto_tenant_id_codigo_unique UNIQUE (tenant_id, codigo);


--
-- TOC entry 4037 (class 2606 OID 76626)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_nomina_empleado_id_cosecha_cuadrilla_id_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_nomina_empleado_id_cosecha_cuadrilla_id_uniq UNIQUE (nomina_empleado_id, cosecha_cuadrilla_id);


--
-- TOC entry 4039 (class 2606 OID 76608)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 4029 (class 2606 OID 76558)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_pkey PRIMARY KEY (id);


--
-- TOC entry 4023 (class 2606 OID 76546)
-- Name: nomina_empleado nomina_empleado_nomina_id_empleado_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_nomina_id_empleado_id_unique UNIQUE (nomina_id, empleado_id);


--
-- TOC entry 4025 (class 2606 OID 76527)
-- Name: nomina_empleado nomina_empleado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_pkey PRIMARY KEY (id);


--
-- TOC entry 4192 (class 2606 OID 77492)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_nomina_empleado_id_hora_extra_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_nomina_empleado_id_hora_extra_id_unique UNIQUE (nomina_empleado_id, hora_extra_id);


--
-- TOC entry 4194 (class 2606 OID 77474)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 4032 (class 2606 OID 76600)
-- Name: nomina_jornal_ref nomina_jornal_ref_nomina_empleado_id_jornal_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_nomina_empleado_id_jornal_id_unique UNIQUE (nomina_empleado_id, jornal_id);


--
-- TOC entry 4034 (class 2606 OID 76582)
-- Name: nomina_jornal_ref nomina_jornal_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 4014 (class 2606 OID 76468)
-- Name: nomina_tabla_legal nomina_tabla_legal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal
    ADD CONSTRAINT nomina_tabla_legal_pkey PRIMARY KEY (id);


--
-- TOC entry 4017 (class 2606 OID 76496)
-- Name: nominas nominas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_pkey PRIMARY KEY (id);


--
-- TOC entry 4021 (class 2606 OID 77597)
-- Name: nominas nominas_tenant_periodo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_tenant_periodo_unique UNIQUE (tenant_id, anio, mes, quincena);


--
-- TOC entry 4113 (class 2606 OID 76923)
-- Name: operaciones operaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4117 (class 2606 OID 76942)
-- Name: operaciones operaciones_tenant_id_fecha_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_tenant_id_fecha_unique UNIQUE (tenant_id, fecha);


--
-- TOC entry 3942 (class 2606 OID 76117)
-- Name: palmas palmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_pkey PRIMARY KEY (id);


--
-- TOC entry 3944 (class 2606 OID 76130)
-- Name: palmas palmas_sublote_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_sublote_id_codigo_unique UNIQUE (sublote_id, codigo);


--
-- TOC entry 3883 (class 2606 OID 75864)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- TOC entry 4056 (class 2606 OID 76768)
-- Name: permissions permissions_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name);


--
-- TOC entry 4058 (class 2606 OID 76766)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3962 (class 2606 OID 76192)
-- Name: precio_abono precio_abono_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_abono
    ADD CONSTRAINT precio_abono_pkey PRIMARY KEY (id);


--
-- TOC entry 3952 (class 2606 OID 76169)
-- Name: precio_cosecha precio_cosecha_lote_id_anio_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_lote_id_anio_unique UNIQUE (lote_id, anio);


--
-- TOC entry 3954 (class 2606 OID 76157)
-- Name: precio_cosecha precio_cosecha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_pkey PRIMARY KEY (id);


--
-- TOC entry 4146 (class 2606 OID 77190)
-- Name: precios_palma precios_palma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma
    ADD CONSTRAINT precios_palma_pkey PRIMARY KEY (id);


--
-- TOC entry 4149 (class 2606 OID 77197)
-- Name: precios_palma precios_palma_tenant_tipo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma
    ADD CONSTRAINT precios_palma_tenant_tipo_unique UNIQUE (tenant_id, tipo);


--
-- TOC entry 3918 (class 2606 OID 76003)
-- Name: predios predios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios
    ADD CONSTRAINT predios_pkey PRIMARY KEY (id);


--
-- TOC entry 3947 (class 2606 OID 76149)
-- Name: promedio_lote promedio_lote_lote_id_anio_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_lote_id_anio_unique UNIQUE (lote_id, anio);


--
-- TOC entry 3949 (class 2606 OID 76137)
-- Name: promedio_lote promedio_lote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_pkey PRIMARY KEY (id);


--
-- TOC entry 4100 (class 2606 OID 76891)
-- Name: pulse_aggregates pulse_aggregates_bucket_period_type_aggregate_key_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_aggregates
    ADD CONSTRAINT pulse_aggregates_bucket_period_type_aggregate_key_hash_unique UNIQUE (bucket, period, type, aggregate, key_hash);


--
-- TOC entry 4104 (class 2606 OID 76889)
-- Name: pulse_aggregates pulse_aggregates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_aggregates
    ADD CONSTRAINT pulse_aggregates_pkey PRIMARY KEY (id);


--
-- TOC entry 4095 (class 2606 OID 76875)
-- Name: pulse_entries pulse_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_entries
    ADD CONSTRAINT pulse_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4088 (class 2606 OID 76861)
-- Name: pulse_values pulse_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_values
    ADD CONSTRAINT pulse_values_pkey PRIMARY KEY (id);


--
-- TOC entry 4092 (class 2606 OID 76865)
-- Name: pulse_values pulse_values_type_key_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_values
    ADD CONSTRAINT pulse_values_type_key_hash_unique UNIQUE (type, key_hash);


--
-- TOC entry 3994 (class 2606 OID 76362)
-- Name: registro_cosecha registro_cosecha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_pkey PRIMARY KEY (id);


--
-- TOC entry 3996 (class 2606 OID 76381)
-- Name: registro_cosecha registro_cosecha_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 4073 (class 2606 OID 76819)
-- Name: role_has_permissions role_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id);


--
-- TOC entry 4060 (class 2606 OID 76777)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4063 (class 2606 OID 76780)
-- Name: roles roles_tenant_id_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_name_guard_name_unique UNIQUE (tenant_id, name, guard_name);


--
-- TOC entry 3928 (class 2606 OID 76067)
-- Name: semilla_lote semilla_lote_lote_id_semilla_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_lote_id_semilla_id_unique UNIQUE (lote_id, semilla_id);


--
-- TOC entry 3930 (class 2606 OID 76050)
-- Name: semilla_lote semilla_lote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_pkey PRIMARY KEY (id);


--
-- TOC entry 3921 (class 2606 OID 76017)
-- Name: semillas semillas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semillas
    ADD CONSTRAINT semillas_pkey PRIMARY KEY (id);


--
-- TOC entry 3886 (class 2606 OID 75871)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3933 (class 2606 OID 76076)
-- Name: sublotes sublotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes
    ADD CONSTRAINT sublotes_pkey PRIMARY KEY (id);


--
-- TOC entry 4078 (class 2606 OID 76829)
-- Name: telescope_entries telescope_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries
    ADD CONSTRAINT telescope_entries_pkey PRIMARY KEY (sequence);


--
-- TOC entry 4083 (class 2606 OID 76840)
-- Name: telescope_entries_tags telescope_entries_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries_tags
    ADD CONSTRAINT telescope_entries_tags_pkey PRIMARY KEY (entry_uuid, tag);


--
-- TOC entry 4081 (class 2606 OID 76831)
-- Name: telescope_entries telescope_entries_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries
    ADD CONSTRAINT telescope_entries_uuid_unique UNIQUE (uuid);


--
-- TOC entry 4086 (class 2606 OID 76851)
-- Name: telescope_monitoring telescope_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_monitoring
    ADD CONSTRAINT telescope_monitoring_pkey PRIMARY KEY (tag);


--
-- TOC entry 3895 (class 2606 OID 75913)
-- Name: tenant_config tenant_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config
    ADD CONSTRAINT tenant_config_pkey PRIMARY KEY (id);


--
-- TOC entry 3897 (class 2606 OID 75920)
-- Name: tenant_config tenant_config_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config
    ADD CONSTRAINT tenant_config_tenant_id_unique UNIQUE (tenant_id);


--
-- TOC entry 3908 (class 2606 OID 75960)
-- Name: tenant_user tenant_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_pkey PRIMARY KEY (id);


--
-- TOC entry 3910 (class 2606 OID 75972)
-- Name: tenant_user tenant_user_tenant_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_tenant_id_user_id_unique UNIQUE (tenant_id, user_id);


--
-- TOC entry 3875 (class 2606 OID 75846)
-- Name: tenants tenants_nit_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_nit_unique UNIQUE (nit);


--
-- TOC entry 3877 (class 2606 OID 75844)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 4179 (class 2606 OID 77400)
-- Name: tipos_hora_extra tipos_hora_extra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra
    ADD CONSTRAINT tipos_hora_extra_pkey PRIMARY KEY (id);


--
-- TOC entry 4181 (class 2606 OID 77407)
-- Name: tipos_hora_extra tipos_hora_extra_tenant_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra
    ADD CONSTRAINT tipos_hora_extra_tenant_id_codigo_unique UNIQUE (tenant_id, codigo);


--
-- TOC entry 4168 (class 2606 OID 77312)
-- Name: transportadores transportadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_pkey PRIMARY KEY (id);


--
-- TOC entry 4172 (class 2606 OID 77324)
-- Name: transportadores transportadores_tenant_id_placa_vehiculo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_tenant_id_placa_vehiculo_unique UNIQUE (tenant_id, placa_vehiculo);


--
-- TOC entry 3879 (class 2606 OID 75857)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 3881 (class 2606 OID 75855)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4046 (class 2606 OID 76674)
-- Name: vacacion_acumulado vacacion_acumulado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado
    ADD CONSTRAINT vacacion_acumulado_pkey PRIMARY KEY (id);


--
-- TOC entry 4042 (class 2606 OID 76641)
-- Name: vacaciones vacaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4001 (class 2606 OID 76389)
-- Name: viaje_detalle viaje_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_pkey PRIMARY KEY (id);


--
-- TOC entry 4197 (class 2606 OID 77504)
-- Name: viaje_documento_bascula viaje_documento_bascula_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_pkey PRIMARY KEY (id);


--
-- TOC entry 3982 (class 2606 OID 76343)
-- Name: viajes viajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_pkey PRIMARY KEY (id);


--
-- TOC entry 3984 (class 2606 OID 76352)
-- Name: viajes viajes_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 3991 (class 2606 OID 77378)
-- Name: viajes viajes_tenant_id_remision_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_tenant_id_remision_unique UNIQUE (tenant_id, remision);


--
-- TOC entry 4212 (class 1259 OID 77570)
-- Name: arl_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX arl_tenant_id_estado_index ON public.arl USING btree (tenant_id, estado);


--
-- TOC entry 3912 (class 1259 OID 75994)
-- Name: auditorias_accion_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditorias_accion_index ON public.auditorias USING btree (accion);


--
-- TOC entry 3913 (class 1259 OID 75995)
-- Name: auditorias_modulo_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditorias_modulo_index ON public.auditorias USING btree (modulo);


--
-- TOC entry 3916 (class 1259 OID 75993)
-- Name: auditorias_tenant_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditorias_tenant_id_created_at_index ON public.auditorias USING btree (tenant_id, created_at);


--
-- TOC entry 4132 (class 1259 OID 77091)
-- Name: ausencias_tenant_id_empleado_id_fecha_inicio_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_empleado_id_fecha_inicio_index ON public.ausencias USING btree (tenant_id, empleado_id, fecha_inicio);


--
-- TOC entry 4133 (class 1259 OID 77093)
-- Name: ausencias_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_estado_index ON public.ausencias USING btree (tenant_id, estado);


--
-- TOC entry 4134 (class 1259 OID 77092)
-- Name: ausencias_tenant_id_fecha_inicio_fecha_fin_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_fecha_inicio_fecha_fin_index ON public.ausencias USING btree (tenant_id, fecha_inicio, fecha_fin);


--
-- TOC entry 4135 (class 1259 OID 77284)
-- Name: ausencias_tenant_id_motivo_ausencia_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_motivo_ausencia_id_index ON public.ausencias USING btree (tenant_id, motivo_ausencia_id);


--
-- TOC entry 4136 (class 1259 OID 77094)
-- Name: ausencias_tenant_id_nomina_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_nomina_id_index ON public.ausencias USING btree (tenant_id, nomina_id);


--
-- TOC entry 4137 (class 1259 OID 77090)
-- Name: ausencias_tenant_id_operacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_operacion_id_index ON public.ausencias USING btree (tenant_id, operacion_id);


--
-- TOC entry 3888 (class 1259 OID 75881)
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- TOC entry 3891 (class 1259 OID 75889)
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- TOC entry 3974 (class 1259 OID 76260)
-- Name: cargos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cargos_tenant_id_estado_index ON public.cargos USING btree (tenant_id, estado);


--
-- TOC entry 4006 (class 1259 OID 76430)
-- Name: cosecha_cuadrilla_tenant_id_cosecha_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cosecha_cuadrilla_tenant_id_cosecha_id_index ON public.cosecha_cuadrilla USING btree (tenant_id, cosecha_id);


--
-- TOC entry 4007 (class 1259 OID 76431)
-- Name: cosecha_cuadrilla_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cosecha_cuadrilla_tenant_id_empleado_id_index ON public.cosecha_cuadrilla USING btree (tenant_id, empleado_id);


--
-- TOC entry 4106 (class 1259 OID 76898)
-- Name: departamentos_nombre_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX departamentos_nombre_index ON public.departamentos USING btree (nombre);


--
-- TOC entry 4120 (class 1259 OID 77012)
-- Name: empleado_contratos_tenant_id_empleado_id_estado_contrato_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_contratos_tenant_id_empleado_id_estado_contrato_index ON public.empleado_contratos USING btree (tenant_id, empleado_id, estado_contrato);


--
-- TOC entry 4121 (class 1259 OID 77011)
-- Name: empleado_contratos_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_contratos_tenant_id_empleado_id_index ON public.empleado_contratos USING btree (tenant_id, empleado_id);


--
-- TOC entry 4122 (class 1259 OID 77013)
-- Name: empleado_contratos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_contratos_tenant_id_estado_index ON public.empleado_contratos USING btree (tenant_id, estado);


--
-- TOC entry 4125 (class 1259 OID 77040)
-- Name: empleado_documentos_tenant_id_empleado_id_categoria_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_documentos_tenant_id_empleado_id_categoria_index ON public.empleado_documentos USING btree (tenant_id, empleado_id, categoria);


--
-- TOC entry 4126 (class 1259 OID 77039)
-- Name: empleado_documentos_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_documentos_tenant_id_empleado_id_index ON public.empleado_documentos USING btree (tenant_id, empleado_id);


--
-- TOC entry 4127 (class 1259 OID 77041)
-- Name: empleado_documentos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_documentos_tenant_id_estado_index ON public.empleado_documentos USING btree (tenant_id, estado);


--
-- TOC entry 3977 (class 1259 OID 77587)
-- Name: empleados_tenant_doc_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX empleados_tenant_doc_active_unique ON public.empleados USING btree (tenant_id, documento) WHERE (deleted_at IS NULL);


--
-- TOC entry 3978 (class 1259 OID 76286)
-- Name: empleados_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleados_tenant_id_estado_index ON public.empleados USING btree (tenant_id, estado);


--
-- TOC entry 3979 (class 1259 OID 77131)
-- Name: empleados_tenant_id_modalidad_pago_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleados_tenant_id_modalidad_pago_index ON public.empleados USING btree (tenant_id, modalidad_pago);


--
-- TOC entry 3980 (class 1259 OID 77132)
-- Name: empleados_tenant_id_predio_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleados_tenant_id_predio_id_index ON public.empleados USING btree (tenant_id, predio_id);


--
-- TOC entry 4164 (class 1259 OID 77302)
-- Name: empresa_transportadora_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empresa_transportadora_tenant_id_estado_index ON public.empresa_transportadora USING btree (tenant_id, estado);


--
-- TOC entry 4217 (class 1259 OID 77586)
-- Name: entidades_bancarias_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entidades_bancarias_tenant_id_estado_index ON public.entidades_bancarias USING btree (tenant_id, estado);


--
-- TOC entry 4202 (class 1259 OID 77538)
-- Name: eps_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eps_tenant_id_estado_index ON public.eps USING btree (tenant_id, estado);


--
-- TOC entry 4175 (class 1259 OID 77354)
-- Name: extractoras_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX extractoras_tenant_id_estado_index ON public.extractoras USING btree (tenant_id, estado);


--
-- TOC entry 4207 (class 1259 OID 77554)
-- Name: fondos_pension_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fondos_pension_tenant_id_estado_index ON public.fondos_pension USING btree (tenant_id, estado);


--
-- TOC entry 4187 (class 1259 OID 77460)
-- Name: horas_extra_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_empleado_id_index ON public.horas_extra USING btree (tenant_id, empleado_id);


--
-- TOC entry 4188 (class 1259 OID 77461)
-- Name: horas_extra_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_estado_index ON public.horas_extra USING btree (tenant_id, estado);


--
-- TOC entry 4189 (class 1259 OID 77462)
-- Name: horas_extra_tenant_id_nomina_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_nomina_id_index ON public.horas_extra USING btree (tenant_id, nomina_id);


--
-- TOC entry 4190 (class 1259 OID 77459)
-- Name: horas_extra_tenant_id_operacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_operacion_id_index ON public.horas_extra USING btree (tenant_id, operacion_id);


--
-- TOC entry 4143 (class 1259 OID 77177)
-- Name: idx_agro_chat_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agro_chat_messages_session ON public.agro_chat_messages USING btree (session_id, created_at);


--
-- TOC entry 4144 (class 1259 OID 77178)
-- Name: idx_agro_chat_messages_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agro_chat_messages_user ON public.agro_chat_messages USING btree (user_id, created_at);


--
-- TOC entry 4140 (class 1259 OID 77151)
-- Name: idx_agro_chat_sessions_user_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agro_chat_sessions_user_tenant ON public.agro_chat_sessions USING btree (user_id, tenant_id, updated_at);


--
-- TOC entry 3958 (class 1259 OID 76184)
-- Name: insumos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX insumos_tenant_id_estado_index ON public.insumos USING btree (tenant_id, estado);


--
-- TOC entry 3900 (class 1259 OID 75930)
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- TOC entry 4154 (class 1259 OID 77249)
-- Name: jornales_tenant_id_categoria_tipo_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jornales_tenant_id_categoria_tipo_index ON public.jornales USING btree (tenant_id, categoria, tipo);


--
-- TOC entry 4155 (class 1259 OID 77250)
-- Name: jornales_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jornales_tenant_id_estado_index ON public.jornales USING btree (tenant_id, estado);


--
-- TOC entry 4156 (class 1259 OID 77248)
-- Name: jornales_tenant_id_operacion_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jornales_tenant_id_operacion_id_empleado_id_index ON public.jornales USING btree (tenant_id, operacion_id, empleado_id);


--
-- TOC entry 3966 (class 1259 OID 76226)
-- Name: labores_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX labores_tenant_id_estado_index ON public.labores USING btree (tenant_id, estado);


--
-- TOC entry 3939 (class 1259 OID 76107)
-- Name: lineas_tenant_id_sublote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lineas_tenant_id_sublote_id_index ON public.lineas USING btree (tenant_id, sublote_id);


--
-- TOC entry 4054 (class 1259 OID 76757)
-- Name: liquidacion_detalle_tenant_id_liquidacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX liquidacion_detalle_tenant_id_liquidacion_id_index ON public.liquidacion_detalle USING btree (tenant_id, liquidacion_id);


--
-- TOC entry 4050 (class 1259 OID 76727)
-- Name: liquidaciones_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX liquidaciones_tenant_id_empleado_id_index ON public.liquidaciones USING btree (tenant_id, empleado_id);


--
-- TOC entry 4051 (class 1259 OID 76728)
-- Name: liquidaciones_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX liquidaciones_tenant_id_estado_index ON public.liquidaciones USING btree (tenant_id, estado);


--
-- TOC entry 3925 (class 1259 OID 76043)
-- Name: lotes_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lotes_tenant_id_estado_index ON public.lotes USING btree (tenant_id, estado);


--
-- TOC entry 3926 (class 1259 OID 76042)
-- Name: lotes_tenant_id_predio_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lotes_tenant_id_predio_id_index ON public.lotes USING btree (tenant_id, predio_id);


--
-- TOC entry 3971 (class 1259 OID 76240)
-- Name: modalidad_contrato_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX modalidad_contrato_tenant_id_estado_index ON public.modalidad_contrato USING btree (tenant_id, estado);


--
-- TOC entry 4064 (class 1259 OID 76784)
-- Name: model_has_permissions_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_permissions_model_id_model_type_index ON public.model_has_permissions USING btree (model_id, model_type);


--
-- TOC entry 4067 (class 1259 OID 76790)
-- Name: model_has_permissions_team_foreign_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_permissions_team_foreign_key_index ON public.model_has_permissions USING btree (tenant_id);


--
-- TOC entry 4068 (class 1259 OID 76796)
-- Name: model_has_roles_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_roles_model_id_model_type_index ON public.model_has_roles USING btree (model_id, model_type);


--
-- TOC entry 4071 (class 1259 OID 76802)
-- Name: model_has_roles_team_foreign_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_roles_team_foreign_key_index ON public.model_has_roles USING btree (tenant_id);


--
-- TOC entry 4159 (class 1259 OID 77277)
-- Name: motivos_ausencia_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX motivos_ausencia_tenant_id_estado_index ON public.motivos_ausencia USING btree (tenant_id, estado);


--
-- TOC entry 4109 (class 1259 OID 76909)
-- Name: municipios_departamento_codigo_nombre_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX municipios_departamento_codigo_nombre_index ON public.municipios USING btree (departamento_codigo, nombre);


--
-- TOC entry 4010 (class 1259 OID 76459)
-- Name: nomina_concepto_tenant_id_activo_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_concepto_tenant_id_activo_index ON public.nomina_concepto USING btree (tenant_id, activo);


--
-- TOC entry 4040 (class 1259 OID 76624)
-- Name: nomina_cosecha_ref_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_cosecha_ref_tenant_id_nomina_empleado_id_index ON public.nomina_cosecha_ref USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4030 (class 1259 OID 76574)
-- Name: nomina_empleado_concepto_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_empleado_concepto_tenant_id_nomina_empleado_id_index ON public.nomina_empleado_concepto USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4026 (class 1259 OID 76544)
-- Name: nomina_empleado_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_empleado_tenant_id_empleado_id_index ON public.nomina_empleado USING btree (tenant_id, empleado_id);


--
-- TOC entry 4027 (class 1259 OID 76543)
-- Name: nomina_empleado_tenant_id_nomina_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_empleado_tenant_id_nomina_id_index ON public.nomina_empleado USING btree (tenant_id, nomina_id);


--
-- TOC entry 4195 (class 1259 OID 77490)
-- Name: nomina_hora_extra_ref_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_hora_extra_ref_tenant_id_nomina_empleado_id_index ON public.nomina_hora_extra_ref USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4035 (class 1259 OID 76598)
-- Name: nomina_jornal_ref_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_jornal_ref_tenant_id_nomina_empleado_id_index ON public.nomina_jornal_ref USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4015 (class 1259 OID 76479)
-- Name: nomina_tabla_legal_tenant_id_concepto_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_tabla_legal_tenant_id_concepto_id_index ON public.nomina_tabla_legal USING btree (tenant_id, concepto_id);


--
-- TOC entry 4018 (class 1259 OID 76508)
-- Name: nominas_tenant_id_anio_mes_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nominas_tenant_id_anio_mes_index ON public.nominas USING btree (tenant_id, anio, mes);


--
-- TOC entry 4019 (class 1259 OID 76507)
-- Name: nominas_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nominas_tenant_id_estado_index ON public.nominas USING btree (tenant_id, estado);


--
-- TOC entry 4114 (class 1259 OID 76940)
-- Name: operaciones_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operaciones_tenant_id_estado_index ON public.operaciones USING btree (tenant_id, estado);


--
-- TOC entry 4115 (class 1259 OID 76939)
-- Name: operaciones_tenant_id_fecha_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operaciones_tenant_id_fecha_index ON public.operaciones USING btree (tenant_id, fecha);


--
-- TOC entry 3940 (class 1259 OID 77106)
-- Name: palmas_linea_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX palmas_linea_id_index ON public.palmas USING btree (linea_id);


--
-- TOC entry 3945 (class 1259 OID 76128)
-- Name: palmas_tenant_id_sublote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX palmas_tenant_id_sublote_id_index ON public.palmas USING btree (tenant_id, sublote_id);


--
-- TOC entry 3963 (class 1259 OID 76976)
-- Name: precio_abono_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX precio_abono_tenant_id_estado_index ON public.precio_abono USING btree (tenant_id, estado);


--
-- TOC entry 3955 (class 1259 OID 76170)
-- Name: precio_cosecha_tenant_id_anio_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX precio_cosecha_tenant_id_anio_index ON public.precio_cosecha USING btree (tenant_id, anio);


--
-- TOC entry 4147 (class 1259 OID 77198)
-- Name: precios_palma_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX precios_palma_tenant_id_estado_index ON public.precios_palma USING btree (tenant_id, estado);


--
-- TOC entry 3919 (class 1259 OID 76009)
-- Name: predios_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX predios_tenant_id_estado_index ON public.predios USING btree (tenant_id, estado);


--
-- TOC entry 3950 (class 1259 OID 76150)
-- Name: promedio_lote_tenant_id_anio_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promedio_lote_tenant_id_anio_index ON public.promedio_lote USING btree (tenant_id, anio);


--
-- TOC entry 4101 (class 1259 OID 76892)
-- Name: pulse_aggregates_period_bucket_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_aggregates_period_bucket_index ON public.pulse_aggregates USING btree (period, bucket);


--
-- TOC entry 4102 (class 1259 OID 76894)
-- Name: pulse_aggregates_period_type_aggregate_bucket_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_aggregates_period_type_aggregate_bucket_index ON public.pulse_aggregates USING btree (period, type, aggregate, bucket);


--
-- TOC entry 4105 (class 1259 OID 76893)
-- Name: pulse_aggregates_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_aggregates_type_index ON public.pulse_aggregates USING btree (type);


--
-- TOC entry 4093 (class 1259 OID 76878)
-- Name: pulse_entries_key_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_key_hash_index ON public.pulse_entries USING btree (key_hash);


--
-- TOC entry 4096 (class 1259 OID 76876)
-- Name: pulse_entries_timestamp_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_timestamp_index ON public.pulse_entries USING btree ("timestamp");


--
-- TOC entry 4097 (class 1259 OID 76879)
-- Name: pulse_entries_timestamp_type_key_hash_value_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_timestamp_type_key_hash_value_index ON public.pulse_entries USING btree ("timestamp", type, key_hash, value);


--
-- TOC entry 4098 (class 1259 OID 76877)
-- Name: pulse_entries_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_type_index ON public.pulse_entries USING btree (type);


--
-- TOC entry 4089 (class 1259 OID 76862)
-- Name: pulse_values_timestamp_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_values_timestamp_index ON public.pulse_values USING btree ("timestamp");


--
-- TOC entry 4090 (class 1259 OID 76863)
-- Name: pulse_values_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_values_type_index ON public.pulse_values USING btree (type);


--
-- TOC entry 3997 (class 1259 OID 76379)
-- Name: registro_cosecha_tenant_id_lote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registro_cosecha_tenant_id_lote_id_index ON public.registro_cosecha USING btree (tenant_id, lote_id);


--
-- TOC entry 3998 (class 1259 OID 76954)
-- Name: registro_cosecha_tenant_id_operacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registro_cosecha_tenant_id_operacion_id_index ON public.registro_cosecha USING btree (tenant_id, operacion_id);


--
-- TOC entry 4061 (class 1259 OID 76778)
-- Name: roles_team_foreign_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX roles_team_foreign_key_index ON public.roles USING btree (tenant_id);


--
-- TOC entry 3931 (class 1259 OID 76068)
-- Name: semilla_lote_tenant_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX semilla_lote_tenant_id_index ON public.semilla_lote USING btree (tenant_id);


--
-- TOC entry 3922 (class 1259 OID 76023)
-- Name: semillas_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX semillas_tenant_id_estado_index ON public.semillas USING btree (tenant_id, estado);


--
-- TOC entry 3884 (class 1259 OID 75873)
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- TOC entry 3887 (class 1259 OID 75872)
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- TOC entry 3934 (class 1259 OID 76087)
-- Name: sublotes_tenant_id_lote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sublotes_tenant_id_lote_id_index ON public.sublotes USING btree (tenant_id, lote_id);


--
-- TOC entry 4074 (class 1259 OID 76832)
-- Name: telescope_entries_batch_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_batch_id_index ON public.telescope_entries USING btree (batch_id);


--
-- TOC entry 4075 (class 1259 OID 76834)
-- Name: telescope_entries_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_created_at_index ON public.telescope_entries USING btree (created_at);


--
-- TOC entry 4076 (class 1259 OID 76833)
-- Name: telescope_entries_family_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_family_hash_index ON public.telescope_entries USING btree (family_hash);


--
-- TOC entry 4084 (class 1259 OID 76841)
-- Name: telescope_entries_tags_tag_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_tags_tag_index ON public.telescope_entries_tags USING btree (tag);


--
-- TOC entry 4079 (class 1259 OID 76835)
-- Name: telescope_entries_type_should_display_on_index_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_type_should_display_on_index_index ON public.telescope_entries USING btree (type, should_display_on_index);


--
-- TOC entry 3911 (class 1259 OID 75973)
-- Name: tenant_user_user_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_user_user_id_estado_index ON public.tenant_user USING btree (user_id, estado);


--
-- TOC entry 4182 (class 1259 OID 77408)
-- Name: tipos_hora_extra_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tipos_hora_extra_tenant_id_estado_index ON public.tipos_hora_extra USING btree (tenant_id, estado);


--
-- TOC entry 4169 (class 1259 OID 77325)
-- Name: transportadores_tenant_id_empresa_transportadora_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transportadores_tenant_id_empresa_transportadora_id_index ON public.transportadores USING btree (tenant_id, empresa_transportadora_id);


--
-- TOC entry 4170 (class 1259 OID 77326)
-- Name: transportadores_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transportadores_tenant_id_estado_index ON public.transportadores USING btree (tenant_id, estado);


--
-- TOC entry 4047 (class 1259 OID 76685)
-- Name: vacacion_acumulado_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vacacion_acumulado_tenant_id_empleado_id_index ON public.vacacion_acumulado USING btree (tenant_id, empleado_id);


--
-- TOC entry 4043 (class 1259 OID 76662)
-- Name: vacaciones_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vacaciones_tenant_id_empleado_id_index ON public.vacaciones USING btree (tenant_id, empleado_id);


--
-- TOC entry 4044 (class 1259 OID 76663)
-- Name: vacaciones_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vacaciones_tenant_id_estado_index ON public.vacaciones USING btree (tenant_id, estado);


--
-- TOC entry 3999 (class 1259 OID 77389)
-- Name: viaje_detalle_cosecha_activa_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX viaje_detalle_cosecha_activa_unique ON public.viaje_detalle USING btree (cosecha_id) WHERE (estado = true);


--
-- TOC entry 4002 (class 1259 OID 77388)
-- Name: viaje_detalle_tenant_id_reconteo_aprobado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_detalle_tenant_id_reconteo_aprobado_index ON public.viaje_detalle USING btree (tenant_id, reconteo_aprobado);


--
-- TOC entry 4003 (class 1259 OID 76406)
-- Name: viaje_detalle_tenant_id_viaje_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_detalle_tenant_id_viaje_id_index ON public.viaje_detalle USING btree (tenant_id, viaje_id);


--
-- TOC entry 4198 (class 1259 OID 77521)
-- Name: viaje_documento_bascula_tenant_id_estado_ocr_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_documento_bascula_tenant_id_estado_ocr_index ON public.viaje_documento_bascula USING btree (tenant_id, estado_ocr);


--
-- TOC entry 4199 (class 1259 OID 77520)
-- Name: viaje_documento_bascula_tenant_id_viaje_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_documento_bascula_tenant_id_viaje_id_index ON public.viaje_documento_bascula USING btree (tenant_id, viaje_id);


--
-- TOC entry 3985 (class 1259 OID 77592)
-- Name: viajes_tenant_id_calidad_materia_prima_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_calidad_materia_prima_index ON public.viajes USING btree (tenant_id, calidad_materia_prima);


--
-- TOC entry 3986 (class 1259 OID 77379)
-- Name: viajes_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_estado_index ON public.viajes USING btree (tenant_id, estado);


--
-- TOC entry 3987 (class 1259 OID 77381)
-- Name: viajes_tenant_id_extractora_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_extractora_id_index ON public.viajes USING btree (tenant_id, extractora_id);


--
-- TOC entry 3988 (class 1259 OID 77591)
-- Name: viajes_tenant_id_fecha_llegada_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_fecha_llegada_index ON public.viajes USING btree (tenant_id, fecha_llegada);


--
-- TOC entry 3989 (class 1259 OID 76349)
-- Name: viajes_tenant_id_fecha_viaje_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_fecha_viaje_index ON public.viajes USING btree (tenant_id, fecha_viaje);


--
-- TOC entry 3992 (class 1259 OID 77380)
-- Name: viajes_tenant_id_transportador_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_transportador_id_index ON public.viajes USING btree (tenant_id, transportador_id);


--
-- TOC entry 4320 (class 2606 OID 77162)
-- Name: agro_chat_messages agro_chat_messages_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_session_id_foreign FOREIGN KEY (session_id) REFERENCES public.agro_chat_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4321 (class 2606 OID 77172)
-- Name: agro_chat_messages agro_chat_messages_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4322 (class 2606 OID 77167)
-- Name: agro_chat_messages agro_chat_messages_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4318 (class 2606 OID 77146)
-- Name: agro_chat_sessions agro_chat_sessions_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions
    ADD CONSTRAINT agro_chat_sessions_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4319 (class 2606 OID 77141)
-- Name: agro_chat_sessions agro_chat_sessions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions
    ADD CONSTRAINT agro_chat_sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4354 (class 2606 OID 77563)
-- Name: arl arl_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl
    ADD CONSTRAINT arl_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4223 (class 2606 OID 75983)
-- Name: auditorias auditorias_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- TOC entry 4224 (class 2606 OID 75988)
-- Name: auditorias auditorias_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4311 (class 2606 OID 77075)
-- Name: ausencias ausencias_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4312 (class 2606 OID 77085)
-- Name: ausencias ausencias_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4313 (class 2606 OID 77070)
-- Name: ausencias ausencias_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE RESTRICT;


--
-- TOC entry 4314 (class 2606 OID 77279)
-- Name: ausencias ausencias_motivo_ausencia_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_motivo_ausencia_id_foreign FOREIGN KEY (motivo_ausencia_id) REFERENCES public.motivos_ausencia(id) ON DELETE RESTRICT;


--
-- TOC entry 4315 (class 2606 OID 77080)
-- Name: ausencias ausencias_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id) ON DELETE RESTRICT;


--
-- TOC entry 4316 (class 2606 OID 77065)
-- Name: ausencias ausencias_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4317 (class 2606 OID 77060)
-- Name: ausencias ausencias_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4247 (class 2606 OID 76255)
-- Name: cargos cargos_modalidad_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_modalidad_id_foreign FOREIGN KEY (modalidad_id) REFERENCES public.modalidad_contrato(id);


--
-- TOC entry 4248 (class 2606 OID 76250)
-- Name: cargos cargos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4264 (class 2606 OID 76420)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_cosecha_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_cosecha_id_foreign FOREIGN KEY (cosecha_id) REFERENCES public.registro_cosecha(id);


--
-- TOC entry 4265 (class 2606 OID 76425)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4266 (class 2606 OID 76415)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4306 (class 2606 OID 76996)
-- Name: empleado_contratos empleado_contratos_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos
    ADD CONSTRAINT empleado_contratos_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4307 (class 2606 OID 76991)
-- Name: empleado_contratos empleado_contratos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos
    ADD CONSTRAINT empleado_contratos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4308 (class 2606 OID 77029)
-- Name: empleado_documentos empleado_documentos_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4309 (class 2606 OID 77034)
-- Name: empleado_documentos empleado_documentos_subido_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_subido_por_foreign FOREIGN KEY (subido_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4310 (class 2606 OID 77024)
-- Name: empleado_documentos empleado_documentos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4249 (class 2606 OID 77108)
-- Name: empleados empleados_predio_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_predio_id_foreign FOREIGN KEY (predio_id) REFERENCES public.predios(id) ON DELETE SET NULL;


--
-- TOC entry 4250 (class 2606 OID 76274)
-- Name: empleados empleados_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4332 (class 2606 OID 77295)
-- Name: empresa_transportadora empresa_transportadora_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora
    ADD CONSTRAINT empresa_transportadora_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4355 (class 2606 OID 77579)
-- Name: entidades_bancarias entidades_bancarias_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias
    ADD CONSTRAINT entidades_bancarias_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4352 (class 2606 OID 77531)
-- Name: eps eps_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps
    ADD CONSTRAINT eps_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4335 (class 2606 OID 77342)
-- Name: extractoras extractoras_departamento_codigo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_departamento_codigo_foreign FOREIGN KEY (departamento_codigo) REFERENCES public.departamentos(codigo) ON DELETE SET NULL;


--
-- TOC entry 4336 (class 2606 OID 77347)
-- Name: extractoras extractoras_municipio_codigo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_municipio_codigo_foreign FOREIGN KEY (municipio_codigo) REFERENCES public.municipios(codigo) ON DELETE SET NULL;


--
-- TOC entry 4337 (class 2606 OID 77337)
-- Name: extractoras extractoras_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4353 (class 2606 OID 77547)
-- Name: fondos_pension fondos_pension_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension
    ADD CONSTRAINT fondos_pension_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4339 (class 2606 OID 77444)
-- Name: horas_extra horas_extra_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4340 (class 2606 OID 77454)
-- Name: horas_extra horas_extra_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4341 (class 2606 OID 77434)
-- Name: horas_extra horas_extra_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE RESTRICT;


--
-- TOC entry 4342 (class 2606 OID 77449)
-- Name: horas_extra horas_extra_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id) ON DELETE RESTRICT;


--
-- TOC entry 4343 (class 2606 OID 77429)
-- Name: horas_extra horas_extra_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4344 (class 2606 OID 77424)
-- Name: horas_extra horas_extra_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4345 (class 2606 OID 77439)
-- Name: horas_extra horas_extra_tipo_hora_extra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_tipo_hora_extra_id_foreign FOREIGN KEY (tipo_hora_extra_id) REFERENCES public.tipos_hora_extra(id) ON DELETE RESTRICT;


--
-- TOC entry 4243 (class 2606 OID 76179)
-- Name: insumos insumos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4324 (class 2606 OID 77223)
-- Name: jornales jornales_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4325 (class 2606 OID 77243)
-- Name: jornales jornales_insumo_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_insumo_id_foreign FOREIGN KEY (insumo_id) REFERENCES public.insumos(id) ON DELETE SET NULL;


--
-- TOC entry 4326 (class 2606 OID 77228)
-- Name: jornales jornales_labor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_labor_id_foreign FOREIGN KEY (labor_id) REFERENCES public.labores(id) ON DELETE RESTRICT;


--
-- TOC entry 4327 (class 2606 OID 77233)
-- Name: jornales jornales_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE SET NULL;


--
-- TOC entry 4328 (class 2606 OID 77218)
-- Name: jornales jornales_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4329 (class 2606 OID 77238)
-- Name: jornales jornales_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id) ON DELETE SET NULL;


--
-- TOC entry 4330 (class 2606 OID 77213)
-- Name: jornales jornales_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4245 (class 2606 OID 76216)
-- Name: labores labores_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores
    ADD CONSTRAINT labores_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4234 (class 2606 OID 76102)
-- Name: lineas lineas_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id);


--
-- TOC entry 4235 (class 2606 OID 76097)
-- Name: lineas lineas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4294 (class 2606 OID 76752)
-- Name: liquidacion_detalle liquidacion_detalle_concepto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_concepto_id_foreign FOREIGN KEY (concepto_id) REFERENCES public.nomina_concepto(id) ON DELETE SET NULL;


--
-- TOC entry 4295 (class 2606 OID 76747)
-- Name: liquidacion_detalle liquidacion_detalle_liquidacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_liquidacion_id_foreign FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones(id);


--
-- TOC entry 4296 (class 2606 OID 76742)
-- Name: liquidacion_detalle liquidacion_detalle_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4291 (class 2606 OID 76722)
-- Name: liquidaciones liquidaciones_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4292 (class 2606 OID 76717)
-- Name: liquidaciones liquidaciones_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4293 (class 2606 OID 76712)
-- Name: liquidaciones liquidaciones_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4227 (class 2606 OID 76037)
-- Name: lotes lotes_predio_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_predio_id_foreign FOREIGN KEY (predio_id) REFERENCES public.predios(id);


--
-- TOC entry 4228 (class 2606 OID 76032)
-- Name: lotes lotes_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4246 (class 2606 OID 76235)
-- Name: modalidad_contrato modalidad_contrato_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modalidad_contrato
    ADD CONSTRAINT modalidad_contrato_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4297 (class 2606 OID 76785)
-- Name: model_has_permissions model_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 4298 (class 2606 OID 76797)
-- Name: model_has_roles model_has_roles_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4331 (class 2606 OID 77270)
-- Name: motivos_ausencia motivos_ausencia_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia
    ADD CONSTRAINT motivos_ausencia_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4302 (class 2606 OID 76904)
-- Name: municipios municipios_departamento_codigo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_departamento_codigo_foreign FOREIGN KEY (departamento_codigo) REFERENCES public.departamentos(codigo) ON DELETE RESTRICT;


--
-- TOC entry 4267 (class 2606 OID 76452)
-- Name: nomina_concepto nomina_concepto_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto
    ADD CONSTRAINT nomina_concepto_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4282 (class 2606 OID 76619)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_cosecha_cuadrilla_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_cosecha_cuadrilla_id_foreign FOREIGN KEY (cosecha_cuadrilla_id) REFERENCES public.cosecha_cuadrilla(id);


--
-- TOC entry 4283 (class 2606 OID 76614)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4284 (class 2606 OID 76609)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4276 (class 2606 OID 76569)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_concepto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_concepto_id_foreign FOREIGN KEY (concepto_id) REFERENCES public.nomina_concepto(id);


--
-- TOC entry 4277 (class 2606 OID 76564)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4278 (class 2606 OID 76559)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4272 (class 2606 OID 76538)
-- Name: nomina_empleado nomina_empleado_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4273 (class 2606 OID 77602)
-- Name: nomina_empleado nomina_empleado_liquidado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_liquidado_por_foreign FOREIGN KEY (liquidado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4274 (class 2606 OID 76533)
-- Name: nomina_empleado nomina_empleado_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id);


--
-- TOC entry 4275 (class 2606 OID 76528)
-- Name: nomina_empleado nomina_empleado_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4346 (class 2606 OID 77485)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_hora_extra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_hora_extra_id_foreign FOREIGN KEY (hora_extra_id) REFERENCES public.horas_extra(id);


--
-- TOC entry 4347 (class 2606 OID 77480)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4348 (class 2606 OID 77475)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4279 (class 2606 OID 77253)
-- Name: nomina_jornal_ref nomina_jornal_ref_jornal_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_jornal_id_foreign FOREIGN KEY (jornal_id) REFERENCES public.jornales(id) ON DELETE RESTRICT;


--
-- TOC entry 4280 (class 2606 OID 76588)
-- Name: nomina_jornal_ref nomina_jornal_ref_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4281 (class 2606 OID 76583)
-- Name: nomina_jornal_ref nomina_jornal_ref_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4268 (class 2606 OID 76474)
-- Name: nomina_tabla_legal nomina_tabla_legal_concepto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal
    ADD CONSTRAINT nomina_tabla_legal_concepto_id_foreign FOREIGN KEY (concepto_id) REFERENCES public.nomina_concepto(id);


--
-- TOC entry 4269 (class 2606 OID 76469)
-- Name: nomina_tabla_legal nomina_tabla_legal_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal
    ADD CONSTRAINT nomina_tabla_legal_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4270 (class 2606 OID 76502)
-- Name: nominas nominas_cerrada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_cerrada_por_foreign FOREIGN KEY (cerrada_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4271 (class 2606 OID 76497)
-- Name: nominas nominas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4303 (class 2606 OID 76934)
-- Name: operaciones operaciones_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4304 (class 2606 OID 76929)
-- Name: operaciones operaciones_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4305 (class 2606 OID 76924)
-- Name: operaciones operaciones_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4236 (class 2606 OID 77101)
-- Name: palmas palmas_linea_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_linea_id_foreign FOREIGN KEY (linea_id) REFERENCES public.lineas(id) ON DELETE SET NULL;


--
-- TOC entry 4237 (class 2606 OID 76123)
-- Name: palmas palmas_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id);


--
-- TOC entry 4238 (class 2606 OID 76118)
-- Name: palmas palmas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4244 (class 2606 OID 76193)
-- Name: precio_abono precio_abono_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_abono
    ADD CONSTRAINT precio_abono_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4241 (class 2606 OID 76163)
-- Name: precio_cosecha precio_cosecha_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4242 (class 2606 OID 76158)
-- Name: precio_cosecha precio_cosecha_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4323 (class 2606 OID 77191)
-- Name: precios_palma precios_palma_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma
    ADD CONSTRAINT precios_palma_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4225 (class 2606 OID 76004)
-- Name: predios predios_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios
    ADD CONSTRAINT predios_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4239 (class 2606 OID 76143)
-- Name: promedio_lote promedio_lote_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4240 (class 2606 OID 76138)
-- Name: promedio_lote promedio_lote_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4256 (class 2606 OID 76368)
-- Name: registro_cosecha registro_cosecha_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4257 (class 2606 OID 76971)
-- Name: registro_cosecha registro_cosecha_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4258 (class 2606 OID 76373)
-- Name: registro_cosecha registro_cosecha_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id);


--
-- TOC entry 4259 (class 2606 OID 76363)
-- Name: registro_cosecha registro_cosecha_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4299 (class 2606 OID 76808)
-- Name: role_has_permissions role_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 4300 (class 2606 OID 76813)
-- Name: role_has_permissions role_has_permissions_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4229 (class 2606 OID 76056)
-- Name: semilla_lote semilla_lote_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4230 (class 2606 OID 76061)
-- Name: semilla_lote semilla_lote_semilla_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_semilla_id_foreign FOREIGN KEY (semilla_id) REFERENCES public.semillas(id);


--
-- TOC entry 4231 (class 2606 OID 76051)
-- Name: semilla_lote semilla_lote_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4226 (class 2606 OID 76018)
-- Name: semillas semillas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semillas
    ADD CONSTRAINT semillas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4232 (class 2606 OID 76082)
-- Name: sublotes sublotes_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes
    ADD CONSTRAINT sublotes_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4233 (class 2606 OID 76077)
-- Name: sublotes sublotes_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes
    ADD CONSTRAINT sublotes_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4301 (class 2606 OID 76842)
-- Name: telescope_entries_tags telescope_entries_tags_entry_uuid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries_tags
    ADD CONSTRAINT telescope_entries_tags_entry_uuid_foreign FOREIGN KEY (entry_uuid) REFERENCES public.telescope_entries(uuid) ON DELETE CASCADE;


--
-- TOC entry 4220 (class 2606 OID 75914)
-- Name: tenant_config tenant_config_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config
    ADD CONSTRAINT tenant_config_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4221 (class 2606 OID 75961)
-- Name: tenant_user tenant_user_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4222 (class 2606 OID 75966)
-- Name: tenant_user tenant_user_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4338 (class 2606 OID 77401)
-- Name: tipos_hora_extra tipos_hora_extra_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra
    ADD CONSTRAINT tipos_hora_extra_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4333 (class 2606 OID 77318)
-- Name: transportadores transportadores_empresa_transportadora_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_empresa_transportadora_id_foreign FOREIGN KEY (empresa_transportadora_id) REFERENCES public.empresa_transportadora(id) ON DELETE RESTRICT;


--
-- TOC entry 4334 (class 2606 OID 77313)
-- Name: transportadores transportadores_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4289 (class 2606 OID 76680)
-- Name: vacacion_acumulado vacacion_acumulado_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado
    ADD CONSTRAINT vacacion_acumulado_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4290 (class 2606 OID 76675)
-- Name: vacacion_acumulado vacacion_acumulado_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado
    ADD CONSTRAINT vacacion_acumulado_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4285 (class 2606 OID 76652)
-- Name: vacaciones vacaciones_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4286 (class 2606 OID 76647)
-- Name: vacaciones vacaciones_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4287 (class 2606 OID 76657)
-- Name: vacaciones vacaciones_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id) ON DELETE SET NULL;


--
-- TOC entry 4288 (class 2606 OID 76642)
-- Name: vacaciones vacaciones_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4260 (class 2606 OID 76400)
-- Name: viaje_detalle viaje_detalle_cosecha_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_cosecha_id_foreign FOREIGN KEY (cosecha_id) REFERENCES public.registro_cosecha(id);


--
-- TOC entry 4261 (class 2606 OID 77383)
-- Name: viaje_detalle viaje_detalle_reconteo_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_reconteo_aprobado_por_foreign FOREIGN KEY (reconteo_aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4262 (class 2606 OID 76390)
-- Name: viaje_detalle viaje_detalle_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4263 (class 2606 OID 76395)
-- Name: viaje_detalle viaje_detalle_viaje_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_viaje_id_foreign FOREIGN KEY (viaje_id) REFERENCES public.viajes(id);


--
-- TOC entry 4349 (class 2606 OID 77515)
-- Name: viaje_documento_bascula viaje_documento_bascula_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4350 (class 2606 OID 77505)
-- Name: viaje_documento_bascula viaje_documento_bascula_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4351 (class 2606 OID 77510)
-- Name: viaje_documento_bascula viaje_documento_bascula_viaje_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_viaje_id_foreign FOREIGN KEY (viaje_id) REFERENCES public.viajes(id) ON DELETE RESTRICT;


--
-- TOC entry 4251 (class 2606 OID 77370)
-- Name: viajes viajes_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4252 (class 2606 OID 77355)
-- Name: viajes viajes_empresa_transportadora_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_empresa_transportadora_id_foreign FOREIGN KEY (empresa_transportadora_id) REFERENCES public.empresa_transportadora(id) ON DELETE RESTRICT;


--
-- TOC entry 4253 (class 2606 OID 77365)
-- Name: viajes viajes_extractora_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_extractora_id_foreign FOREIGN KEY (extractora_id) REFERENCES public.extractoras(id) ON DELETE RESTRICT;


--
-- TOC entry 4254 (class 2606 OID 76344)
-- Name: viajes viajes_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4255 (class 2606 OID 77360)
-- Name: viajes viajes_transportador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_transportador_id_foreign FOREIGN KEY (transportador_id) REFERENCES public.transportadores(id) ON DELETE RESTRICT;


--
-- TOC entry 4504 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO agente_user;


--
-- TOC entry 4505 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE agro_chat_messages; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agro_chat_messages TO agente_user;


--
-- TOC entry 4507 (class 0 OID 0)
-- Dependencies: 325
-- Name: SEQUENCE agro_chat_messages_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.agro_chat_messages_id_seq TO agente_user;


--
-- TOC entry 4508 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE agro_chat_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agro_chat_sessions TO agente_user;


--
-- TOC entry 4510 (class 0 OID 0)
-- Dependencies: 323
-- Name: SEQUENCE agro_chat_sessions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.agro_chat_sessions_id_seq TO agente_user;


--
-- TOC entry 4511 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE arl; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.arl TO agente_user;


--
-- TOC entry 4513 (class 0 OID 0)
-- Dependencies: 351
-- Name: SEQUENCE arl_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.arl_id_seq TO agente_user;


--
-- TOC entry 4514 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE auditorias; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.auditorias TO agente_user;


--
-- TOC entry 4516 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE auditorias_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.auditorias_id_seq TO agente_user;


--
-- TOC entry 4517 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE ausencias; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ausencias TO agente_user;


--
-- TOC entry 4519 (class 0 OID 0)
-- Dependencies: 321
-- Name: SEQUENCE ausencias_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.ausencias_id_seq TO agente_user;


--
-- TOC entry 4520 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE cache; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cache TO agente_user;


--
-- TOC entry 4521 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE cache_locks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cache_locks TO agente_user;


--
-- TOC entry 4522 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE cargos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cargos TO agente_user;


--
-- TOC entry 4524 (class 0 OID 0)
-- Dependencies: 262
-- Name: SEQUENCE cargos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.cargos_id_seq TO agente_user;


--
-- TOC entry 4525 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE cosecha_cuadrilla; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cosecha_cuadrilla TO agente_user;


--
-- TOC entry 4527 (class 0 OID 0)
-- Dependencies: 272
-- Name: SEQUENCE cosecha_cuadrilla_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.cosecha_cuadrilla_id_seq TO agente_user;


--
-- TOC entry 4528 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE departamentos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.departamentos TO agente_user;


--
-- TOC entry 4529 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE empleado_contratos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empleado_contratos TO agente_user;


--
-- TOC entry 4531 (class 0 OID 0)
-- Dependencies: 317
-- Name: SEQUENCE empleado_contratos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empleado_contratos_id_seq TO agente_user;


--
-- TOC entry 4532 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE empleado_documentos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empleado_documentos TO agente_user;


--
-- TOC entry 4534 (class 0 OID 0)
-- Dependencies: 319
-- Name: SEQUENCE empleado_documentos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empleado_documentos_id_seq TO agente_user;


--
-- TOC entry 4535 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE empleados; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empleados TO agente_user;


--
-- TOC entry 4537 (class 0 OID 0)
-- Dependencies: 264
-- Name: SEQUENCE empleados_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empleados_id_seq TO agente_user;


--
-- TOC entry 4538 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE empresa_transportadora; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empresa_transportadora TO agente_user;


--
-- TOC entry 4540 (class 0 OID 0)
-- Dependencies: 333
-- Name: SEQUENCE empresa_transportadora_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empresa_transportadora_id_seq TO agente_user;


--
-- TOC entry 4541 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE entidades_bancarias; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.entidades_bancarias TO agente_user;


--
-- TOC entry 4543 (class 0 OID 0)
-- Dependencies: 353
-- Name: SEQUENCE entidades_bancarias_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.entidades_bancarias_id_seq TO agente_user;


--
-- TOC entry 4544 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE eps; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.eps TO agente_user;


--
-- TOC entry 4546 (class 0 OID 0)
-- Dependencies: 347
-- Name: SEQUENCE eps_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.eps_id_seq TO agente_user;


--
-- TOC entry 4547 (class 0 OID 0)
-- Dependencies: 338
-- Name: TABLE extractoras; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.extractoras TO agente_user;


--
-- TOC entry 4549 (class 0 OID 0)
-- Dependencies: 337
-- Name: SEQUENCE extractoras_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.extractoras_id_seq TO agente_user;


--
-- TOC entry 4550 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE failed_jobs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.failed_jobs TO agente_user;


--
-- TOC entry 4552 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE failed_jobs_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.failed_jobs_id_seq TO agente_user;


--
-- TOC entry 4553 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE fondos_pension; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.fondos_pension TO agente_user;


--
-- TOC entry 4555 (class 0 OID 0)
-- Dependencies: 349
-- Name: SEQUENCE fondos_pension_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.fondos_pension_id_seq TO agente_user;


--
-- TOC entry 4556 (class 0 OID 0)
-- Dependencies: 342
-- Name: TABLE horas_extra; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.horas_extra TO agente_user;


--
-- TOC entry 4558 (class 0 OID 0)
-- Dependencies: 341
-- Name: SEQUENCE horas_extra_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.horas_extra_id_seq TO agente_user;


--
-- TOC entry 4559 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE insumos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.insumos TO agente_user;


--
-- TOC entry 4561 (class 0 OID 0)
-- Dependencies: 254
-- Name: SEQUENCE insumos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.insumos_id_seq TO agente_user;


--
-- TOC entry 4562 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE job_batches; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_batches TO agente_user;


--
-- TOC entry 4563 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE jobs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.jobs TO agente_user;


--
-- TOC entry 4565 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE jobs_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.jobs_id_seq TO agente_user;


--
-- TOC entry 4566 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE jornales; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.jornales TO agente_user;


--
-- TOC entry 4568 (class 0 OID 0)
-- Dependencies: 329
-- Name: SEQUENCE jornales_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.jornales_id_seq TO agente_user;


--
-- TOC entry 4569 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE labores; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.labores TO agente_user;


--
-- TOC entry 4571 (class 0 OID 0)
-- Dependencies: 258
-- Name: SEQUENCE labores_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.labores_id_seq TO agente_user;


--
-- TOC entry 4572 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE lineas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lineas TO agente_user;


--
-- TOC entry 4574 (class 0 OID 0)
-- Dependencies: 246
-- Name: SEQUENCE lineas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lineas_id_seq TO agente_user;


--
-- TOC entry 4575 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE liquidacion_detalle; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.liquidacion_detalle TO agente_user;


--
-- TOC entry 4577 (class 0 OID 0)
-- Dependencies: 294
-- Name: SEQUENCE liquidacion_detalle_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.liquidacion_detalle_id_seq TO agente_user;


--
-- TOC entry 4578 (class 0 OID 0)
-- Dependencies: 293
-- Name: TABLE liquidaciones; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.liquidaciones TO agente_user;


--
-- TOC entry 4580 (class 0 OID 0)
-- Dependencies: 292
-- Name: SEQUENCE liquidaciones_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.liquidaciones_id_seq TO agente_user;


--
-- TOC entry 4581 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE lotes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lotes TO agente_user;


--
-- TOC entry 4583 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE lotes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lotes_id_seq TO agente_user;


--
-- TOC entry 4584 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE migrations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.migrations TO agente_user;


--
-- TOC entry 4586 (class 0 OID 0)
-- Dependencies: 215
-- Name: SEQUENCE migrations_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.migrations_id_seq TO agente_user;


--
-- TOC entry 4587 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE modalidad_contrato; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.modalidad_contrato TO agente_user;


--
-- TOC entry 4589 (class 0 OID 0)
-- Dependencies: 260
-- Name: SEQUENCE modalidad_contrato_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.modalidad_contrato_id_seq TO agente_user;


--
-- TOC entry 4590 (class 0 OID 0)
-- Dependencies: 300
-- Name: TABLE model_has_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.model_has_permissions TO agente_user;


--
-- TOC entry 4591 (class 0 OID 0)
-- Dependencies: 301
-- Name: TABLE model_has_roles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.model_has_roles TO agente_user;


--
-- TOC entry 4592 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE motivos_ausencia; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.motivos_ausencia TO agente_user;


--
-- TOC entry 4594 (class 0 OID 0)
-- Dependencies: 331
-- Name: SEQUENCE motivos_ausencia_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.motivos_ausencia_id_seq TO agente_user;


--
-- TOC entry 4595 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE municipios; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.municipios TO agente_user;


--
-- TOC entry 4596 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE nomina_concepto; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_concepto TO agente_user;


--
-- TOC entry 4598 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE nomina_concepto_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_concepto_id_seq TO agente_user;


--
-- TOC entry 4599 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE nomina_cosecha_ref; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_cosecha_ref TO agente_user;


--
-- TOC entry 4601 (class 0 OID 0)
-- Dependencies: 286
-- Name: SEQUENCE nomina_cosecha_ref_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_cosecha_ref_id_seq TO agente_user;


--
-- TOC entry 4602 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE nomina_empleado; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_empleado TO agente_user;


--
-- TOC entry 4603 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE nomina_empleado_concepto; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_empleado_concepto TO agente_user;


--
-- TOC entry 4605 (class 0 OID 0)
-- Dependencies: 282
-- Name: SEQUENCE nomina_empleado_concepto_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_empleado_concepto_id_seq TO agente_user;


--
-- TOC entry 4607 (class 0 OID 0)
-- Dependencies: 280
-- Name: SEQUENCE nomina_empleado_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_empleado_id_seq TO agente_user;


--
-- TOC entry 4608 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE nomina_hora_extra_ref; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_hora_extra_ref TO agente_user;


--
-- TOC entry 4610 (class 0 OID 0)
-- Dependencies: 343
-- Name: SEQUENCE nomina_hora_extra_ref_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_hora_extra_ref_id_seq TO agente_user;


--
-- TOC entry 4611 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE nomina_jornal_ref; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_jornal_ref TO agente_user;


--
-- TOC entry 4613 (class 0 OID 0)
-- Dependencies: 284
-- Name: SEQUENCE nomina_jornal_ref_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_jornal_ref_id_seq TO agente_user;


--
-- TOC entry 4614 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE nomina_tabla_legal; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_tabla_legal TO agente_user;


--
-- TOC entry 4616 (class 0 OID 0)
-- Dependencies: 276
-- Name: SEQUENCE nomina_tabla_legal_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_tabla_legal_id_seq TO agente_user;


--
-- TOC entry 4617 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE nominas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nominas TO agente_user;


--
-- TOC entry 4619 (class 0 OID 0)
-- Dependencies: 278
-- Name: SEQUENCE nominas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nominas_id_seq TO agente_user;


--
-- TOC entry 4620 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE operaciones; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.operaciones TO agente_user;


--
-- TOC entry 4622 (class 0 OID 0)
-- Dependencies: 315
-- Name: SEQUENCE operaciones_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.operaciones_id_seq TO agente_user;


--
-- TOC entry 4623 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE palmas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.palmas TO agente_user;


--
-- TOC entry 4625 (class 0 OID 0)
-- Dependencies: 248
-- Name: SEQUENCE palmas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.palmas_id_seq TO agente_user;


--
-- TOC entry 4626 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE password_reset_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.password_reset_tokens TO agente_user;


--
-- TOC entry 4627 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.permissions TO agente_user;


--
-- TOC entry 4629 (class 0 OID 0)
-- Dependencies: 296
-- Name: SEQUENCE permissions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.permissions_id_seq TO agente_user;


--
-- TOC entry 4630 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE precio_abono; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.precio_abono TO agente_user;


--
-- TOC entry 4632 (class 0 OID 0)
-- Dependencies: 256
-- Name: SEQUENCE precio_abono_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.precio_abono_id_seq TO agente_user;


--
-- TOC entry 4633 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE precio_cosecha; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.precio_cosecha TO agente_user;


--
-- TOC entry 4635 (class 0 OID 0)
-- Dependencies: 252
-- Name: SEQUENCE precio_cosecha_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.precio_cosecha_id_seq TO agente_user;


--
-- TOC entry 4636 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE precios_palma; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.precios_palma TO agente_user;


--
-- TOC entry 4638 (class 0 OID 0)
-- Dependencies: 327
-- Name: SEQUENCE precios_palma_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.precios_palma_id_seq TO agente_user;


--
-- TOC entry 4639 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE predios; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.predios TO agente_user;


--
-- TOC entry 4641 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE predios_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.predios_id_seq TO agente_user;


--
-- TOC entry 4642 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE promedio_lote; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.promedio_lote TO agente_user;


--
-- TOC entry 4644 (class 0 OID 0)
-- Dependencies: 250
-- Name: SEQUENCE promedio_lote_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.promedio_lote_id_seq TO agente_user;


--
-- TOC entry 4645 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE pulse_aggregates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pulse_aggregates TO agente_user;


--
-- TOC entry 4647 (class 0 OID 0)
-- Dependencies: 311
-- Name: SEQUENCE pulse_aggregates_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pulse_aggregates_id_seq TO agente_user;


--
-- TOC entry 4648 (class 0 OID 0)
-- Dependencies: 310
-- Name: TABLE pulse_entries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pulse_entries TO agente_user;


--
-- TOC entry 4650 (class 0 OID 0)
-- Dependencies: 309
-- Name: SEQUENCE pulse_entries_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pulse_entries_id_seq TO agente_user;


--
-- TOC entry 4651 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE pulse_values; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pulse_values TO agente_user;


--
-- TOC entry 4653 (class 0 OID 0)
-- Dependencies: 307
-- Name: SEQUENCE pulse_values_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pulse_values_id_seq TO agente_user;


--
-- TOC entry 4654 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE registro_cosecha; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.registro_cosecha TO agente_user;


--
-- TOC entry 4656 (class 0 OID 0)
-- Dependencies: 268
-- Name: SEQUENCE registro_cosecha_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.registro_cosecha_id_seq TO agente_user;


--
-- TOC entry 4657 (class 0 OID 0)
-- Dependencies: 302
-- Name: TABLE role_has_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.role_has_permissions TO agente_user;


--
-- TOC entry 4658 (class 0 OID 0)
-- Dependencies: 299
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.roles TO agente_user;


--
-- TOC entry 4660 (class 0 OID 0)
-- Dependencies: 298
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.roles_id_seq TO agente_user;


--
-- TOC entry 4661 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE semilla_lote; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.semilla_lote TO agente_user;


--
-- TOC entry 4663 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE semilla_lote_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.semilla_lote_id_seq TO agente_user;


--
-- TOC entry 4664 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE semillas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.semillas TO agente_user;


--
-- TOC entry 4666 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE semillas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.semillas_id_seq TO agente_user;


--
-- TOC entry 4667 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.sessions TO agente_user;


--
-- TOC entry 4668 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE sublotes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.sublotes TO agente_user;


--
-- TOC entry 4670 (class 0 OID 0)
-- Dependencies: 244
-- Name: SEQUENCE sublotes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.sublotes_id_seq TO agente_user;


--
-- TOC entry 4671 (class 0 OID 0)
-- Dependencies: 304
-- Name: TABLE telescope_entries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.telescope_entries TO agente_user;


--
-- TOC entry 4673 (class 0 OID 0)
-- Dependencies: 303
-- Name: SEQUENCE telescope_entries_sequence_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.telescope_entries_sequence_seq TO agente_user;


--
-- TOC entry 4674 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE telescope_entries_tags; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.telescope_entries_tags TO agente_user;


--
-- TOC entry 4675 (class 0 OID 0)
-- Dependencies: 306
-- Name: TABLE telescope_monitoring; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.telescope_monitoring TO agente_user;


--
-- TOC entry 4676 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE tenant_config; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenant_config TO agente_user;


--
-- TOC entry 4678 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE tenant_config_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tenant_config_id_seq TO agente_user;


--
-- TOC entry 4679 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE tenant_user; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenant_user TO agente_user;


--
-- TOC entry 4681 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE tenant_user_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tenant_user_id_seq TO agente_user;


--
-- TOC entry 4682 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenants TO agente_user;


--
-- TOC entry 4684 (class 0 OID 0)
-- Dependencies: 217
-- Name: SEQUENCE tenants_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tenants_id_seq TO agente_user;


--
-- TOC entry 4685 (class 0 OID 0)
-- Dependencies: 340
-- Name: TABLE tipos_hora_extra; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tipos_hora_extra TO agente_user;


--
-- TOC entry 4687 (class 0 OID 0)
-- Dependencies: 339
-- Name: SEQUENCE tipos_hora_extra_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tipos_hora_extra_id_seq TO agente_user;


--
-- TOC entry 4688 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE transportadores; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transportadores TO agente_user;


--
-- TOC entry 4690 (class 0 OID 0)
-- Dependencies: 335
-- Name: SEQUENCE transportadores_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.transportadores_id_seq TO agente_user;


--
-- TOC entry 4691 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO agente_user;


--
-- TOC entry 4693 (class 0 OID 0)
-- Dependencies: 219
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.users_id_seq TO agente_user;


--
-- TOC entry 4694 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE vacacion_acumulado; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.vacacion_acumulado TO agente_user;


--
-- TOC entry 4696 (class 0 OID 0)
-- Dependencies: 290
-- Name: SEQUENCE vacacion_acumulado_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.vacacion_acumulado_id_seq TO agente_user;


--
-- TOC entry 4697 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE vacaciones; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.vacaciones TO agente_user;


--
-- TOC entry 4699 (class 0 OID 0)
-- Dependencies: 288
-- Name: SEQUENCE vacaciones_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.vacaciones_id_seq TO agente_user;


--
-- TOC entry 4700 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE viaje_detalle; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.viaje_detalle TO agente_user;


--
-- TOC entry 4702 (class 0 OID 0)
-- Dependencies: 270
-- Name: SEQUENCE viaje_detalle_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.viaje_detalle_id_seq TO agente_user;


--
-- TOC entry 4703 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE viaje_documento_bascula; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.viaje_documento_bascula TO agente_user;


--
-- TOC entry 4705 (class 0 OID 0)
-- Dependencies: 345
-- Name: SEQUENCE viaje_documento_bascula_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.viaje_documento_bascula_id_seq TO agente_user;


--
-- TOC entry 4706 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE viajes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.viajes TO agente_user;


--
-- TOC entry 4708 (class 0 OID 0)
-- Dependencies: 266
-- Name: SEQUENCE viajes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.viajes_id_seq TO agente_user;


--
-- TOC entry 2405 (class 826 OID 65789)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE agro_user IN SCHEMA public GRANT ALL ON SEQUENCES TO agente_user;


--
-- TOC entry 2403 (class 826 OID 43785)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO agente_user;


--
-- TOC entry 2401 (class 826 OID 43816)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO agente_user;


--
-- TOC entry 2404 (class 826 OID 65788)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE agro_user IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO agente_user;


--
-- TOC entry 2402 (class 826 OID 43784)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO agente_user;


-- Completed on 2026-05-06 18:20:27

--
-- PostgreSQL database dump complete
--

\unrestrict QkzerfBPSeupFUybkDGDYFFyZXtn3TfYx0CvaeWQKsVShjpfYbFdhCM5aNj6yjh

