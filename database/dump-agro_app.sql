--
-- PostgreSQL database dump
--

\restrict x9fG6yyzwdiapIxkx9RzwyMl9KGwd5m4QppH1qzLloLgW8cKub99JVQAW7ylF6B

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-13 11:20:17

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
ALTER TABLE ONLY public.market_proveedor_user DROP CONSTRAINT market_proveedor_user_user_id_foreign;
ALTER TABLE ONLY public.market_proveedor_user DROP CONSTRAINT market_proveedor_user_proveedor_id_foreign;
ALTER TABLE ONLY public.market_productos DROP CONSTRAINT market_productos_unidad_medida_id_foreign;
ALTER TABLE ONLY public.market_productos DROP CONSTRAINT market_productos_proveedor_id_foreign;
ALTER TABLE ONLY public.market_productos DROP CONSTRAINT market_productos_categoria_id_foreign;
ALTER TABLE ONLY public.market_producto_imagenes DROP CONSTRAINT market_producto_imagenes_producto_id_foreign;
ALTER TABLE ONLY public.market_precios_volumen DROP CONSTRAINT market_precios_volumen_producto_id_foreign;
ALTER TABLE ONLY public.market_pedidos DROP CONSTRAINT market_pedidos_tenant_id_foreign;
ALTER TABLE ONLY public.market_pedidos DROP CONSTRAINT market_pedidos_proveedor_id_foreign;
ALTER TABLE ONLY public.market_pedido_items DROP CONSTRAINT market_pedido_items_producto_id_foreign;
ALTER TABLE ONLY public.market_pedido_items DROP CONSTRAINT market_pedido_items_pedido_id_foreign;
ALTER TABLE ONLY public.market_pedido_estados_historial DROP CONSTRAINT market_pedido_estados_historial_user_id_foreign;
ALTER TABLE ONLY public.market_pedido_estados_historial DROP CONSTRAINT market_pedido_estados_historial_pedido_id_foreign;
ALTER TABLE ONLY public.market_carritos DROP CONSTRAINT market_carritos_tenant_id_foreign;
ALTER TABLE ONLY public.market_carrito_items DROP CONSTRAINT market_carrito_items_producto_id_foreign;
ALTER TABLE ONLY public.market_carrito_items DROP CONSTRAINT market_carrito_items_carrito_id_foreign;
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
DROP INDEX public.viajes_tenant_id_numero_remision_extractora_index;
DROP INDEX public.viajes_tenant_id_fecha_viaje_index;
DROP INDEX public.viajes_tenant_id_fecha_llegada_index;
DROP INDEX public.viajes_tenant_id_extractora_id_index;
DROP INDEX public.viajes_tenant_id_estado_index;
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
DROP INDEX public.market_proveedor_user_user_id_estado_index;
DROP INDEX public.market_productos_proveedor_id_estado_index;
DROP INDEX public.market_productos_nombre_index;
DROP INDEX public.market_productos_categoria_id_index;
DROP INDEX public.market_precios_volumen_producto_id_index;
DROP INDEX public.market_pedidos_tenant_id_estado_index;
DROP INDEX public.market_pedidos_proveedor_id_estado_index;
DROP INDEX public.market_pedidos_fecha_pedido_index;
DROP INDEX public.market_pedido_items_pedido_id_index;
DROP INDEX public.market_pedido_estados_historial_pedido_id_fecha_cambio_index;
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
ALTER TABLE ONLY public.market_unidades_medida DROP CONSTRAINT market_unidades_medida_pkey;
ALTER TABLE ONLY public.market_unidades_medida DROP CONSTRAINT market_unidades_medida_codigo_unique;
ALTER TABLE ONLY public.market_proveedores DROP CONSTRAINT market_proveedores_pkey;
ALTER TABLE ONLY public.market_proveedores DROP CONSTRAINT market_proveedores_nit_unique;
ALTER TABLE ONLY public.market_proveedores DROP CONSTRAINT market_proveedores_email_unique;
ALTER TABLE ONLY public.market_proveedor_user DROP CONSTRAINT market_proveedor_user_proveedor_id_user_id_unique;
ALTER TABLE ONLY public.market_proveedor_user DROP CONSTRAINT market_proveedor_user_pkey;
ALTER TABLE ONLY public.market_productos DROP CONSTRAINT market_productos_sku_unique;
ALTER TABLE ONLY public.market_productos DROP CONSTRAINT market_productos_pkey;
ALTER TABLE ONLY public.market_producto_imagenes DROP CONSTRAINT market_producto_imagenes_pkey;
ALTER TABLE ONLY public.market_precios_volumen DROP CONSTRAINT market_precios_volumen_pkey;
ALTER TABLE ONLY public.market_pedidos DROP CONSTRAINT market_pedidos_pkey;
ALTER TABLE ONLY public.market_pedidos DROP CONSTRAINT market_pedidos_codigo_unique;
ALTER TABLE ONLY public.market_pedido_items DROP CONSTRAINT market_pedido_items_pkey;
ALTER TABLE ONLY public.market_pedido_estados_historial DROP CONSTRAINT market_pedido_estados_historial_pkey;
ALTER TABLE ONLY public.market_categorias DROP CONSTRAINT market_categorias_slug_unique;
ALTER TABLE ONLY public.market_categorias DROP CONSTRAINT market_categorias_pkey;
ALTER TABLE ONLY public.market_carritos DROP CONSTRAINT market_carritos_tenant_id_unique;
ALTER TABLE ONLY public.market_carritos DROP CONSTRAINT market_carritos_pkey;
ALTER TABLE ONLY public.market_carrito_items DROP CONSTRAINT market_carrito_items_pkey;
ALTER TABLE ONLY public.market_carrito_items DROP CONSTRAINT market_carrito_items_carrito_id_producto_id_unique;
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
ALTER TABLE public.market_unidades_medida ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_proveedores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_proveedor_user ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_productos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_producto_imagenes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_precios_volumen ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_pedidos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_pedido_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_pedido_estados_historial ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_categorias ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_carritos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.market_carrito_items ALTER COLUMN id DROP DEFAULT;
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
DROP SEQUENCE public.market_unidades_medida_id_seq;
DROP TABLE public.market_unidades_medida;
DROP SEQUENCE public.market_proveedores_id_seq;
DROP TABLE public.market_proveedores;
DROP SEQUENCE public.market_proveedor_user_id_seq;
DROP TABLE public.market_proveedor_user;
DROP SEQUENCE public.market_productos_id_seq;
DROP TABLE public.market_productos;
DROP SEQUENCE public.market_producto_imagenes_id_seq;
DROP TABLE public.market_producto_imagenes;
DROP SEQUENCE public.market_precios_volumen_id_seq;
DROP TABLE public.market_precios_volumen;
DROP SEQUENCE public.market_pedidos_id_seq;
DROP TABLE public.market_pedidos;
DROP SEQUENCE public.market_pedido_items_id_seq;
DROP TABLE public.market_pedido_items;
DROP SEQUENCE public.market_pedido_estados_historial_id_seq;
DROP TABLE public.market_pedido_estados_historial;
DROP SEQUENCE public.market_categorias_id_seq;
DROP TABLE public.market_categorias;
DROP SEQUENCE public.market_carritos_id_seq;
DROP TABLE public.market_carritos;
DROP SEQUENCE public.market_carrito_items_id_seq;
DROP TABLE public.market_carrito_items;
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
-- TOC entry 326 (class 1259 OID 87100)
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
-- TOC entry 325 (class 1259 OID 87099)
-- Name: agro_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agro_chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4677 (class 0 OID 0)
-- Dependencies: 325
-- Name: agro_chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agro_chat_messages_id_seq OWNED BY public.agro_chat_messages.id;


--
-- TOC entry 324 (class 1259 OID 87081)
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
-- TOC entry 323 (class 1259 OID 87080)
-- Name: agro_chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agro_chat_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4680 (class 0 OID 0)
-- Dependencies: 323
-- Name: agro_chat_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agro_chat_sessions_id_seq OWNED BY public.agro_chat_sessions.id;


--
-- TOC entry 352 (class 1259 OID 87503)
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
-- TOC entry 351 (class 1259 OID 87502)
-- Name: arl_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.arl_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4683 (class 0 OID 0)
-- Dependencies: 351
-- Name: arl_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arl_id_seq OWNED BY public.arl.id;


--
-- TOC entry 235 (class 1259 OID 85923)
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
-- TOC entry 234 (class 1259 OID 85922)
-- Name: auditorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditorias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4686 (class 0 OID 0)
-- Dependencies: 234
-- Name: auditorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditorias_id_seq OWNED BY public.auditorias.id;


--
-- TOC entry 322 (class 1259 OID 86990)
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
-- TOC entry 321 (class 1259 OID 86989)
-- Name: ausencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ausencias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4689 (class 0 OID 0)
-- Dependencies: 321
-- Name: ausencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ausencias_id_seq OWNED BY public.ausencias.id;


--
-- TOC entry 223 (class 1259 OID 85822)
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 85830)
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


--
-- TOC entry 263 (class 1259 OID 86190)
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
-- TOC entry 262 (class 1259 OID 86189)
-- Name: cargos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cargos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4694 (class 0 OID 0)
-- Dependencies: 262
-- Name: cargos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cargos_id_seq OWNED BY public.cargos.id;


--
-- TOC entry 273 (class 1259 OID 86355)
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
-- TOC entry 272 (class 1259 OID 86354)
-- Name: cosecha_cuadrilla_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cosecha_cuadrilla_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4697 (class 0 OID 0)
-- Dependencies: 272
-- Name: cosecha_cuadrilla_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cosecha_cuadrilla_id_seq OWNED BY public.cosecha_cuadrilla.id;


--
-- TOC entry 313 (class 1259 OID 86842)
-- Name: departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamentos (
    codigo character(2) NOT NULL,
    nombre character varying(100) NOT NULL
);


--
-- TOC entry 318 (class 1259 OID 86927)
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
-- TOC entry 317 (class 1259 OID 86926)
-- Name: empleado_contratos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleado_contratos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4701 (class 0 OID 0)
-- Dependencies: 317
-- Name: empleado_contratos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleado_contratos_id_seq OWNED BY public.empleado_contratos.id;


--
-- TOC entry 320 (class 1259 OID 86962)
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
-- TOC entry 319 (class 1259 OID 86961)
-- Name: empleado_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleado_documentos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4704 (class 0 OID 0)
-- Dependencies: 319
-- Name: empleado_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleado_documentos_id_seq OWNED BY public.empleado_documentos.id;


--
-- TOC entry 265 (class 1259 OID 86210)
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
-- TOC entry 264 (class 1259 OID 86209)
-- Name: empleados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4707 (class 0 OID 0)
-- Dependencies: 264
-- Name: empleados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleados_id_seq OWNED BY public.empleados.id;


--
-- TOC entry 334 (class 1259 OID 87233)
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
-- TOC entry 333 (class 1259 OID 87232)
-- Name: empresa_transportadora_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresa_transportadora_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4710 (class 0 OID 0)
-- Dependencies: 333
-- Name: empresa_transportadora_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresa_transportadora_id_seq OWNED BY public.empresa_transportadora.id;


--
-- TOC entry 354 (class 1259 OID 87519)
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
-- TOC entry 353 (class 1259 OID 87518)
-- Name: entidades_bancarias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entidades_bancarias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4713 (class 0 OID 0)
-- Dependencies: 353
-- Name: entidades_bancarias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entidades_bancarias_id_seq OWNED BY public.entidades_bancarias.id;


--
-- TOC entry 348 (class 1259 OID 87471)
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
-- TOC entry 347 (class 1259 OID 87470)
-- Name: eps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4716 (class 0 OID 0)
-- Dependencies: 347
-- Name: eps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eps_id_seq OWNED BY public.eps.id;


--
-- TOC entry 338 (class 1259 OID 87275)
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
-- TOC entry 337 (class 1259 OID 87274)
-- Name: extractoras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.extractoras_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4719 (class 0 OID 0)
-- Dependencies: 337
-- Name: extractoras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.extractoras_id_seq OWNED BY public.extractoras.id;


--
-- TOC entry 231 (class 1259 OID 85887)
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
-- TOC entry 230 (class 1259 OID 85886)
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4722 (class 0 OID 0)
-- Dependencies: 230
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- TOC entry 350 (class 1259 OID 87487)
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
-- TOC entry 349 (class 1259 OID 87486)
-- Name: fondos_pension_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fondos_pension_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4725 (class 0 OID 0)
-- Dependencies: 349
-- Name: fondos_pension_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fondos_pension_id_seq OWNED BY public.fondos_pension.id;


--
-- TOC entry 342 (class 1259 OID 87359)
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
-- TOC entry 341 (class 1259 OID 87358)
-- Name: horas_extra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.horas_extra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4728 (class 0 OID 0)
-- Dependencies: 341
-- Name: horas_extra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.horas_extra_id_seq OWNED BY public.horas_extra.id;


--
-- TOC entry 255 (class 1259 OID 86120)
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
-- TOC entry 254 (class 1259 OID 86119)
-- Name: insumos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.insumos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4731 (class 0 OID 0)
-- Dependencies: 254
-- Name: insumos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.insumos_id_seq OWNED BY public.insumos.id;


--
-- TOC entry 229 (class 1259 OID 85879)
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
-- TOC entry 228 (class 1259 OID 85870)
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
-- TOC entry 227 (class 1259 OID 85869)
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4735 (class 0 OID 0)
-- Dependencies: 227
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- TOC entry 330 (class 1259 OID 87147)
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
-- TOC entry 329 (class 1259 OID 87146)
-- Name: jornales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jornales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4738 (class 0 OID 0)
-- Dependencies: 329
-- Name: jornales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jornales_id_seq OWNED BY public.jornales.id;


--
-- TOC entry 259 (class 1259 OID 86153)
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
-- TOC entry 258 (class 1259 OID 86152)
-- Name: labores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4741 (class 0 OID 0)
-- Dependencies: 258
-- Name: labores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labores_id_seq OWNED BY public.labores.id;


--
-- TOC entry 247 (class 1259 OID 86037)
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
-- TOC entry 246 (class 1259 OID 86036)
-- Name: lineas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lineas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4744 (class 0 OID 0)
-- Dependencies: 246
-- Name: lineas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lineas_id_seq OWNED BY public.lineas.id;


--
-- TOC entry 295 (class 1259 OID 86677)
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
-- TOC entry 294 (class 1259 OID 86676)
-- Name: liquidacion_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.liquidacion_detalle_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4747 (class 0 OID 0)
-- Dependencies: 294
-- Name: liquidacion_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.liquidacion_detalle_id_seq OWNED BY public.liquidacion_detalle.id;


--
-- TOC entry 293 (class 1259 OID 86634)
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
-- TOC entry 292 (class 1259 OID 86633)
-- Name: liquidaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.liquidaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4750 (class 0 OID 0)
-- Dependencies: 292
-- Name: liquidaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.liquidaciones_id_seq OWNED BY public.liquidaciones.id;


--
-- TOC entry 241 (class 1259 OID 85973)
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
-- TOC entry 240 (class 1259 OID 85972)
-- Name: lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4753 (class 0 OID 0)
-- Dependencies: 240
-- Name: lotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lotes_id_seq OWNED BY public.lotes.id;


--
-- TOC entry 372 (class 1259 OID 87702)
-- Name: market_carrito_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_carrito_items (
    id bigint NOT NULL,
    carrito_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    cantidad integer NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 371 (class 1259 OID 87701)
-- Name: market_carrito_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_carrito_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4756 (class 0 OID 0)
-- Dependencies: 371
-- Name: market_carrito_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_carrito_items_id_seq OWNED BY public.market_carrito_items.id;


--
-- TOC entry 370 (class 1259 OID 87688)
-- Name: market_carritos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_carritos (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 369 (class 1259 OID 87687)
-- Name: market_carritos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_carritos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4759 (class 0 OID 0)
-- Dependencies: 369
-- Name: market_carritos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_carritos_id_seq OWNED BY public.market_carritos.id;


--
-- TOC entry 360 (class 1259 OID 87598)
-- Name: market_categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_categorias (
    id bigint NOT NULL,
    nombre character varying(80) NOT NULL,
    slug character varying(100) NOT NULL,
    descripcion character varying(255),
    icono character varying(100),
    orden smallint DEFAULT '0'::smallint NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 359 (class 1259 OID 87597)
-- Name: market_categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_categorias_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4762 (class 0 OID 0)
-- Dependencies: 359
-- Name: market_categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_categorias_id_seq OWNED BY public.market_categorias.id;


--
-- TOC entry 378 (class 1259 OID 87770)
-- Name: market_pedido_estados_historial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_pedido_estados_historial (
    id bigint NOT NULL,
    pedido_id bigint NOT NULL,
    estado_anterior character varying(40),
    estado_nuevo character varying(40) NOT NULL,
    user_id bigint,
    comentario text,
    fecha_cambio timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 377 (class 1259 OID 87769)
-- Name: market_pedido_estados_historial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_pedido_estados_historial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4765 (class 0 OID 0)
-- Dependencies: 377
-- Name: market_pedido_estados_historial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_pedido_estados_historial_id_seq OWNED BY public.market_pedido_estados_historial.id;


--
-- TOC entry 376 (class 1259 OID 87750)
-- Name: market_pedido_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_pedido_items (
    id bigint NOT NULL,
    pedido_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    descuento numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    nombre_producto character varying(200) NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 375 (class 1259 OID 87749)
-- Name: market_pedido_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_pedido_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4768 (class 0 OID 0)
-- Dependencies: 375
-- Name: market_pedido_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_pedido_items_id_seq OWNED BY public.market_pedido_items.id;


--
-- TOC entry 374 (class 1259 OID 87721)
-- Name: market_pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_pedidos (
    id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    tenant_id bigint NOT NULL,
    proveedor_id bigint NOT NULL,
    estado character varying(255) DEFAULT 'pendiente'::character varying NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    costo_envio numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(14,2) NOT NULL,
    metodo_pago character varying(60) DEFAULT 'Transferencia Bancaria'::character varying NOT NULL,
    direccion_entrega character varying(500) NOT NULL,
    notas text,
    fecha_pedido timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_entrega_estimada date,
    fecha_entrega_real timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT market_pedidos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'preparando'::character varying, 'en_transito'::character varying, 'entregado'::character varying, 'cancelado'::character varying])::text[])))
);


--
-- TOC entry 373 (class 1259 OID 87720)
-- Name: market_pedidos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_pedidos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4771 (class 0 OID 0)
-- Dependencies: 373
-- Name: market_pedidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_pedidos_id_seq OWNED BY public.market_pedidos.id;


--
-- TOC entry 368 (class 1259 OID 87674)
-- Name: market_precios_volumen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_precios_volumen (
    id bigint NOT NULL,
    producto_id bigint NOT NULL,
    cantidad_minima integer NOT NULL,
    precio_unidad numeric(12,2) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 367 (class 1259 OID 87673)
-- Name: market_precios_volumen_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_precios_volumen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4774 (class 0 OID 0)
-- Dependencies: 367
-- Name: market_precios_volumen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_precios_volumen_id_seq OWNED BY public.market_precios_volumen.id;


--
-- TOC entry 366 (class 1259 OID 87658)
-- Name: market_producto_imagenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_producto_imagenes (
    id bigint NOT NULL,
    producto_id bigint NOT NULL,
    url character varying(500) NOT NULL,
    orden smallint DEFAULT '0'::smallint NOT NULL,
    alt_text character varying(150),
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 365 (class 1259 OID 87657)
-- Name: market_producto_imagenes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_producto_imagenes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4777 (class 0 OID 0)
-- Dependencies: 365
-- Name: market_producto_imagenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_producto_imagenes_id_seq OWNED BY public.market_producto_imagenes.id;


--
-- TOC entry 364 (class 1259 OID 87621)
-- Name: market_productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_productos (
    id bigint NOT NULL,
    proveedor_id bigint NOT NULL,
    categoria_id bigint NOT NULL,
    unidad_medida_id bigint NOT NULL,
    sku character varying(50),
    nombre character varying(150) NOT NULL,
    descripcion text NOT NULL,
    especificaciones jsonb,
    precio_unitario numeric(12,2) NOT NULL,
    stock_disponible integer DEFAULT 0 NOT NULL,
    stock_minimo integer,
    imagen_principal character varying(500),
    estado character varying(255) DEFAULT 'activo'::character varying NOT NULL,
    destacado boolean DEFAULT false NOT NULL,
    calificacion_promedio numeric(3,2) DEFAULT '0'::numeric NOT NULL,
    "total_reseñas" integer DEFAULT 0 NOT NULL,
    unidades_vendidas integer DEFAULT 0 NOT NULL,
    ingresos_acumulados numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT market_productos_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'agotado'::character varying])::text[])))
);


--
-- TOC entry 363 (class 1259 OID 87620)
-- Name: market_productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_productos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4780 (class 0 OID 0)
-- Dependencies: 363
-- Name: market_productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_productos_id_seq OWNED BY public.market_productos.id;


--
-- TOC entry 358 (class 1259 OID 87575)
-- Name: market_proveedor_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_proveedor_user (
    id bigint NOT NULL,
    proveedor_id bigint NOT NULL,
    user_id bigint NOT NULL,
    rol character varying(255) DEFAULT 'ADMIN'::character varying NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT market_proveedor_user_rol_check CHECK (((rol)::text = ANY ((ARRAY['ADMIN'::character varying, 'OPERADOR'::character varying])::text[])))
);


--
-- TOC entry 357 (class 1259 OID 87574)
-- Name: market_proveedor_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_proveedor_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4783 (class 0 OID 0)
-- Dependencies: 357
-- Name: market_proveedor_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_proveedor_user_id_seq OWNED BY public.market_proveedor_user.id;


--
-- TOC entry 356 (class 1259 OID 87558)
-- Name: market_proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_proveedores (
    id bigint NOT NULL,
    nombre_empresa character varying(150) NOT NULL,
    nit character varying(20),
    telefono character varying(20) NOT NULL,
    email character varying(150) NOT NULL,
    direccion character varying(255) NOT NULL,
    ciudad character varying(80) NOT NULL,
    departamento character varying(80) NOT NULL,
    descripcion text,
    logo_url character varying(500),
    estado character varying(255) DEFAULT 'activo'::character varying NOT NULL,
    calificacion_promedio numeric(3,2) DEFAULT '0'::numeric NOT NULL,
    total_ventas integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT market_proveedores_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])))
);


--
-- TOC entry 355 (class 1259 OID 87557)
-- Name: market_proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_proveedores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4786 (class 0 OID 0)
-- Dependencies: 355
-- Name: market_proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_proveedores_id_seq OWNED BY public.market_proveedores.id;


--
-- TOC entry 362 (class 1259 OID 87611)
-- Name: market_unidades_medida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_unidades_medida (
    id bigint NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(40) NOT NULL,
    abreviatura character varying(15) NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- TOC entry 361 (class 1259 OID 87610)
-- Name: market_unidades_medida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.market_unidades_medida_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4789 (class 0 OID 0)
-- Dependencies: 361
-- Name: market_unidades_medida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.market_unidades_medida_id_seq OWNED BY public.market_unidades_medida.id;


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
-- TOC entry 4792 (class 0 OID 0)
-- Dependencies: 215
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- TOC entry 261 (class 1259 OID 86176)
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
-- TOC entry 260 (class 1259 OID 86175)
-- Name: modalidad_contrato_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modalidad_contrato_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4795 (class 0 OID 0)
-- Dependencies: 260
-- Name: modalidad_contrato_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modalidad_contrato_id_seq OWNED BY public.modalidad_contrato.id;


--
-- TOC entry 300 (class 1259 OID 86728)
-- Name: model_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_permissions (
    permission_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL,
    tenant_id bigint NOT NULL
);


--
-- TOC entry 301 (class 1259 OID 86740)
-- Name: model_has_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_roles (
    role_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL,
    tenant_id bigint NOT NULL
);


--
-- TOC entry 332 (class 1259 OID 87206)
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
-- TOC entry 331 (class 1259 OID 87205)
-- Name: motivos_ausencia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.motivos_ausencia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4800 (class 0 OID 0)
-- Dependencies: 331
-- Name: motivos_ausencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.motivos_ausencia_id_seq OWNED BY public.motivos_ausencia.id;


--
-- TOC entry 314 (class 1259 OID 86848)
-- Name: municipios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipios (
    codigo character(5) NOT NULL,
    nombre character varying(100) NOT NULL,
    departamento_codigo character(2) NOT NULL
);


--
-- TOC entry 275 (class 1259 OID 86380)
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
-- TOC entry 274 (class 1259 OID 86379)
-- Name: nomina_concepto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_concepto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4804 (class 0 OID 0)
-- Dependencies: 274
-- Name: nomina_concepto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_concepto_id_seq OWNED BY public.nomina_concepto.id;


--
-- TOC entry 287 (class 1259 OID 86549)
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
-- TOC entry 286 (class 1259 OID 86548)
-- Name: nomina_cosecha_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_cosecha_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4807 (class 0 OID 0)
-- Dependencies: 286
-- Name: nomina_cosecha_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_cosecha_ref_id_seq OWNED BY public.nomina_cosecha_ref.id;


--
-- TOC entry 281 (class 1259 OID 86457)
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
-- TOC entry 283 (class 1259 OID 86495)
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
-- TOC entry 282 (class 1259 OID 86494)
-- Name: nomina_empleado_concepto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_empleado_concepto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4811 (class 0 OID 0)
-- Dependencies: 282
-- Name: nomina_empleado_concepto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_empleado_concepto_id_seq OWNED BY public.nomina_empleado_concepto.id;


--
-- TOC entry 280 (class 1259 OID 86456)
-- Name: nomina_empleado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_empleado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4813 (class 0 OID 0)
-- Dependencies: 280
-- Name: nomina_empleado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_empleado_id_seq OWNED BY public.nomina_empleado.id;


--
-- TOC entry 344 (class 1259 OID 87415)
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
-- TOC entry 343 (class 1259 OID 87414)
-- Name: nomina_hora_extra_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_hora_extra_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4816 (class 0 OID 0)
-- Dependencies: 343
-- Name: nomina_hora_extra_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_hora_extra_ref_id_seq OWNED BY public.nomina_hora_extra_ref.id;


--
-- TOC entry 285 (class 1259 OID 86523)
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
-- TOC entry 284 (class 1259 OID 86522)
-- Name: nomina_jornal_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_jornal_ref_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4819 (class 0 OID 0)
-- Dependencies: 284
-- Name: nomina_jornal_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_jornal_ref_id_seq OWNED BY public.nomina_jornal_ref.id;


--
-- TOC entry 277 (class 1259 OID 86408)
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
-- TOC entry 276 (class 1259 OID 86407)
-- Name: nomina_tabla_legal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nomina_tabla_legal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4822 (class 0 OID 0)
-- Dependencies: 276
-- Name: nomina_tabla_legal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nomina_tabla_legal_id_seq OWNED BY public.nomina_tabla_legal.id;


--
-- TOC entry 279 (class 1259 OID 86428)
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
-- TOC entry 278 (class 1259 OID 86427)
-- Name: nominas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nominas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4825 (class 0 OID 0)
-- Dependencies: 278
-- Name: nominas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nominas_id_seq OWNED BY public.nominas.id;


--
-- TOC entry 316 (class 1259 OID 86860)
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
-- TOC entry 315 (class 1259 OID 86859)
-- Name: operaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4828 (class 0 OID 0)
-- Dependencies: 315
-- Name: operaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operaciones_id_seq OWNED BY public.operaciones.id;


--
-- TOC entry 249 (class 1259 OID 86059)
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
-- TOC entry 248 (class 1259 OID 86058)
-- Name: palmas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.palmas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4831 (class 0 OID 0)
-- Dependencies: 248
-- Name: palmas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.palmas_id_seq OWNED BY public.palmas.id;


--
-- TOC entry 221 (class 1259 OID 85806)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- TOC entry 297 (class 1259 OID 86706)
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
-- TOC entry 296 (class 1259 OID 86705)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4835 (class 0 OID 0)
-- Dependencies: 296
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 257 (class 1259 OID 86134)
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
-- TOC entry 256 (class 1259 OID 86133)
-- Name: precio_abono_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precio_abono_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4838 (class 0 OID 0)
-- Dependencies: 256
-- Name: precio_abono_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precio_abono_id_seq OWNED BY public.precio_abono.id;


--
-- TOC entry 253 (class 1259 OID 86100)
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
-- TOC entry 252 (class 1259 OID 86099)
-- Name: precio_cosecha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precio_cosecha_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4841 (class 0 OID 0)
-- Dependencies: 252
-- Name: precio_cosecha_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precio_cosecha_id_seq OWNED BY public.precio_cosecha.id;


--
-- TOC entry 328 (class 1259 OID 87130)
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
-- TOC entry 327 (class 1259 OID 87129)
-- Name: precios_palma_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.precios_palma_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4844 (class 0 OID 0)
-- Dependencies: 327
-- Name: precios_palma_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.precios_palma_id_seq OWNED BY public.precios_palma.id;


--
-- TOC entry 237 (class 1259 OID 85945)
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
-- TOC entry 236 (class 1259 OID 85944)
-- Name: predios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.predios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4847 (class 0 OID 0)
-- Dependencies: 236
-- Name: predios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.predios_id_seq OWNED BY public.predios.id;


--
-- TOC entry 251 (class 1259 OID 86080)
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
-- TOC entry 250 (class 1259 OID 86079)
-- Name: promedio_lote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promedio_lote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4850 (class 0 OID 0)
-- Dependencies: 250
-- Name: promedio_lote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promedio_lote_id_seq OWNED BY public.promedio_lote.id;


--
-- TOC entry 312 (class 1259 OID 86828)
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
-- TOC entry 311 (class 1259 OID 86827)
-- Name: pulse_aggregates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pulse_aggregates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4853 (class 0 OID 0)
-- Dependencies: 311
-- Name: pulse_aggregates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pulse_aggregates_id_seq OWNED BY public.pulse_aggregates.id;


--
-- TOC entry 310 (class 1259 OID 86814)
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
-- TOC entry 309 (class 1259 OID 86813)
-- Name: pulse_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pulse_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4856 (class 0 OID 0)
-- Dependencies: 309
-- Name: pulse_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pulse_entries_id_seq OWNED BY public.pulse_entries.id;


--
-- TOC entry 308 (class 1259 OID 86800)
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
-- TOC entry 307 (class 1259 OID 86799)
-- Name: pulse_values_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pulse_values_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4859 (class 0 OID 0)
-- Dependencies: 307
-- Name: pulse_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pulse_values_id_seq OWNED BY public.pulse_values.id;


--
-- TOC entry 269 (class 1259 OID 86302)
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
-- TOC entry 268 (class 1259 OID 86301)
-- Name: registro_cosecha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registro_cosecha_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4862 (class 0 OID 0)
-- Dependencies: 268
-- Name: registro_cosecha_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registro_cosecha_id_seq OWNED BY public.registro_cosecha.id;


--
-- TOC entry 302 (class 1259 OID 86752)
-- Name: role_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_has_permissions (
    permission_id bigint NOT NULL,
    role_id bigint NOT NULL
);


--
-- TOC entry 299 (class 1259 OID 86717)
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
-- TOC entry 298 (class 1259 OID 86716)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4866 (class 0 OID 0)
-- Dependencies: 298
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 243 (class 1259 OID 85993)
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
-- TOC entry 242 (class 1259 OID 85992)
-- Name: semilla_lote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.semilla_lote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4869 (class 0 OID 0)
-- Dependencies: 242
-- Name: semilla_lote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.semilla_lote_id_seq OWNED BY public.semilla_lote.id;


--
-- TOC entry 239 (class 1259 OID 85959)
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
-- TOC entry 238 (class 1259 OID 85958)
-- Name: semillas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.semillas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4872 (class 0 OID 0)
-- Dependencies: 238
-- Name: semillas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.semillas_id_seq OWNED BY public.semillas.id;


--
-- TOC entry 222 (class 1259 OID 85813)
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
-- TOC entry 245 (class 1259 OID 86018)
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
-- TOC entry 244 (class 1259 OID 86017)
-- Name: sublotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sublotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4876 (class 0 OID 0)
-- Dependencies: 244
-- Name: sublotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sublotes_id_seq OWNED BY public.sublotes.id;


--
-- TOC entry 304 (class 1259 OID 86768)
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
-- TOC entry 303 (class 1259 OID 86767)
-- Name: telescope_entries_sequence_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telescope_entries_sequence_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4879 (class 0 OID 0)
-- Dependencies: 303
-- Name: telescope_entries_sequence_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telescope_entries_sequence_seq OWNED BY public.telescope_entries.sequence;


--
-- TOC entry 305 (class 1259 OID 86783)
-- Name: telescope_entries_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_entries_tags (
    entry_uuid uuid NOT NULL,
    tag character varying(255) NOT NULL
);


--
-- TOC entry 306 (class 1259 OID 86794)
-- Name: telescope_monitoring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_monitoring (
    tag character varying(255) NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 85839)
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
    modulo_market boolean DEFAULT false NOT NULL,
    CONSTRAINT tenant_config_tipo_pago_nomina_check CHECK (((tipo_pago_nomina)::text = ANY ((ARRAY['QUINCENAL'::character varying, 'MENSUAL'::character varying])::text[])))
);


--
-- TOC entry 225 (class 1259 OID 85838)
-- Name: tenant_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4884 (class 0 OID 0)
-- Dependencies: 225
-- Name: tenant_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_config_id_seq OWNED BY public.tenant_config.id;


--
-- TOC entry 233 (class 1259 OID 85901)
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
-- TOC entry 232 (class 1259 OID 85900)
-- Name: tenant_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenant_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4887 (class 0 OID 0)
-- Dependencies: 232
-- Name: tenant_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenant_user_id_seq OWNED BY public.tenant_user.id;


--
-- TOC entry 218 (class 1259 OID 85780)
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
-- TOC entry 217 (class 1259 OID 85779)
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4890 (class 0 OID 0)
-- Dependencies: 217
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- TOC entry 340 (class 1259 OID 87338)
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
-- TOC entry 339 (class 1259 OID 87337)
-- Name: tipos_hora_extra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipos_hora_extra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4893 (class 0 OID 0)
-- Dependencies: 339
-- Name: tipos_hora_extra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_hora_extra_id_seq OWNED BY public.tipos_hora_extra.id;


--
-- TOC entry 336 (class 1259 OID 87251)
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
-- TOC entry 335 (class 1259 OID 87250)
-- Name: transportadores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transportadores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4896 (class 0 OID 0)
-- Dependencies: 335
-- Name: transportadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transportadores_id_seq OWNED BY public.transportadores.id;


--
-- TOC entry 220 (class 1259 OID 85796)
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
-- TOC entry 219 (class 1259 OID 85795)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4899 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 291 (class 1259 OID 86612)
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
-- TOC entry 290 (class 1259 OID 86611)
-- Name: vacacion_acumulado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vacacion_acumulado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4902 (class 0 OID 0)
-- Dependencies: 290
-- Name: vacacion_acumulado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vacacion_acumulado_id_seq OWNED BY public.vacacion_acumulado.id;


--
-- TOC entry 289 (class 1259 OID 86575)
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
-- TOC entry 288 (class 1259 OID 86574)
-- Name: vacaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vacaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4905 (class 0 OID 0)
-- Dependencies: 288
-- Name: vacaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vacaciones_id_seq OWNED BY public.vacaciones.id;


--
-- TOC entry 271 (class 1259 OID 86331)
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
-- TOC entry 270 (class 1259 OID 86330)
-- Name: viaje_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viaje_detalle_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4908 (class 0 OID 0)
-- Dependencies: 270
-- Name: viaje_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viaje_detalle_id_seq OWNED BY public.viaje_detalle.id;


--
-- TOC entry 346 (class 1259 OID 87442)
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
-- TOC entry 345 (class 1259 OID 87441)
-- Name: viaje_documento_bascula_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viaje_documento_bascula_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4911 (class 0 OID 0)
-- Dependencies: 345
-- Name: viaje_documento_bascula_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viaje_documento_bascula_id_seq OWNED BY public.viaje_documento_bascula.id;


--
-- TOC entry 267 (class 1259 OID 86280)
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
    observaciones_extractora character varying(500),
    fruto_verde numeric(5,2),
    sobre_maduro numeric(5,2),
    podrido numeric(5,2),
    pedunculo_largo numeric(5,2),
    mal_formado numeric(5,2),
    CONSTRAINT viajes_estado_check CHECK (((estado)::text = ANY ((ARRAY['CREADO'::character varying, 'EN_VALIDACION'::character varying, 'FINALIZADO'::character varying])::text[]))),
    CONSTRAINT viajes_sync_estado_check CHECK (((sync_estado)::text = ANY ((ARRAY['LOCAL'::character varying, 'SINCRONIZADO'::character varying])::text[])))
);


--
-- TOC entry 266 (class 1259 OID 86279)
-- Name: viajes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viajes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4914 (class 0 OID 0)
-- Dependencies: 266
-- Name: viajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viajes_id_seq OWNED BY public.viajes.id;


--
-- TOC entry 3852 (class 2604 OID 87103)
-- Name: agro_chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages ALTER COLUMN id SET DEFAULT nextval('public.agro_chat_messages_id_seq'::regclass);


--
-- TOC entry 3850 (class 2604 OID 87084)
-- Name: agro_chat_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions ALTER COLUMN id SET DEFAULT nextval('public.agro_chat_sessions_id_seq'::regclass);


--
-- TOC entry 3888 (class 2604 OID 87506)
-- Name: arl id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl ALTER COLUMN id SET DEFAULT nextval('public.arl_id_seq'::regclass);


--
-- TOC entry 3708 (class 2604 OID 85926)
-- Name: auditorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias ALTER COLUMN id SET DEFAULT nextval('public.auditorias_id_seq'::regclass);


--
-- TOC entry 3842 (class 2604 OID 86993)
-- Name: ausencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias ALTER COLUMN id SET DEFAULT nextval('public.ausencias_id_seq'::regclass);


--
-- TOC entry 3734 (class 2604 OID 86193)
-- Name: cargos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos ALTER COLUMN id SET DEFAULT nextval('public.cargos_id_seq'::regclass);


--
-- TOC entry 3751 (class 2604 OID 86358)
-- Name: cosecha_cuadrilla id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla ALTER COLUMN id SET DEFAULT nextval('public.cosecha_cuadrilla_id_seq'::regclass);


--
-- TOC entry 3837 (class 2604 OID 86930)
-- Name: empleado_contratos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos ALTER COLUMN id SET DEFAULT nextval('public.empleado_contratos_id_seq'::regclass);


--
-- TOC entry 3840 (class 2604 OID 86965)
-- Name: empleado_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos ALTER COLUMN id SET DEFAULT nextval('public.empleado_documentos_id_seq'::regclass);


--
-- TOC entry 3736 (class 2604 OID 86213)
-- Name: empleados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados ALTER COLUMN id SET DEFAULT nextval('public.empleados_id_seq'::regclass);


--
-- TOC entry 3865 (class 2604 OID 87236)
-- Name: empresa_transportadora id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora ALTER COLUMN id SET DEFAULT nextval('public.empresa_transportadora_id_seq'::regclass);


--
-- TOC entry 3890 (class 2604 OID 87522)
-- Name: entidades_bancarias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias ALTER COLUMN id SET DEFAULT nextval('public.entidades_bancarias_id_seq'::regclass);


--
-- TOC entry 3884 (class 2604 OID 87474)
-- Name: eps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps ALTER COLUMN id SET DEFAULT nextval('public.eps_id_seq'::regclass);


--
-- TOC entry 3869 (class 2604 OID 87278)
-- Name: extractoras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras ALTER COLUMN id SET DEFAULT nextval('public.extractoras_id_seq'::regclass);


--
-- TOC entry 3703 (class 2604 OID 85890)
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- TOC entry 3886 (class 2604 OID 87490)
-- Name: fondos_pension id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension ALTER COLUMN id SET DEFAULT nextval('public.fondos_pension_id_seq'::regclass);


--
-- TOC entry 3876 (class 2604 OID 87362)
-- Name: horas_extra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra ALTER COLUMN id SET DEFAULT nextval('public.horas_extra_id_seq'::regclass);


--
-- TOC entry 3725 (class 2604 OID 86123)
-- Name: insumos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos ALTER COLUMN id SET DEFAULT nextval('public.insumos_id_seq'::regclass);


--
-- TOC entry 3702 (class 2604 OID 85873)
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- TOC entry 3856 (class 2604 OID 87150)
-- Name: jornales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales ALTER COLUMN id SET DEFAULT nextval('public.jornales_id_seq'::regclass);


--
-- TOC entry 3729 (class 2604 OID 86156)
-- Name: labores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores ALTER COLUMN id SET DEFAULT nextval('public.labores_id_seq'::regclass);


--
-- TOC entry 3718 (class 2604 OID 86040)
-- Name: lineas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas ALTER COLUMN id SET DEFAULT nextval('public.lineas_id_seq'::regclass);


--
-- TOC entry 3821 (class 2604 OID 86680)
-- Name: liquidacion_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle ALTER COLUMN id SET DEFAULT nextval('public.liquidacion_detalle_id_seq'::regclass);


--
-- TOC entry 3805 (class 2604 OID 86637)
-- Name: liquidaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones ALTER COLUMN id SET DEFAULT nextval('public.liquidaciones_id_seq'::regclass);


--
-- TOC entry 3713 (class 2604 OID 85976)
-- Name: lotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes ALTER COLUMN id SET DEFAULT nextval('public.lotes_id_seq'::regclass);


--
-- TOC entry 3918 (class 2604 OID 87705)
-- Name: market_carrito_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carrito_items ALTER COLUMN id SET DEFAULT nextval('public.market_carrito_items_id_seq'::regclass);


--
-- TOC entry 3917 (class 2604 OID 87691)
-- Name: market_carritos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carritos ALTER COLUMN id SET DEFAULT nextval('public.market_carritos_id_seq'::regclass);


--
-- TOC entry 3899 (class 2604 OID 87601)
-- Name: market_categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_categorias ALTER COLUMN id SET DEFAULT nextval('public.market_categorias_id_seq'::regclass);


--
-- TOC entry 3927 (class 2604 OID 87773)
-- Name: market_pedido_estados_historial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_estados_historial ALTER COLUMN id SET DEFAULT nextval('public.market_pedido_estados_historial_id_seq'::regclass);


--
-- TOC entry 3924 (class 2604 OID 87753)
-- Name: market_pedido_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_items ALTER COLUMN id SET DEFAULT nextval('public.market_pedido_items_id_seq'::regclass);


--
-- TOC entry 3919 (class 2604 OID 87724)
-- Name: market_pedidos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedidos ALTER COLUMN id SET DEFAULT nextval('public.market_pedidos_id_seq'::regclass);


--
-- TOC entry 3915 (class 2604 OID 87677)
-- Name: market_precios_volumen id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_precios_volumen ALTER COLUMN id SET DEFAULT nextval('public.market_precios_volumen_id_seq'::regclass);


--
-- TOC entry 3912 (class 2604 OID 87661)
-- Name: market_producto_imagenes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_producto_imagenes ALTER COLUMN id SET DEFAULT nextval('public.market_producto_imagenes_id_seq'::regclass);


--
-- TOC entry 3904 (class 2604 OID 87624)
-- Name: market_productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_productos ALTER COLUMN id SET DEFAULT nextval('public.market_productos_id_seq'::regclass);


--
-- TOC entry 3896 (class 2604 OID 87578)
-- Name: market_proveedor_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedor_user ALTER COLUMN id SET DEFAULT nextval('public.market_proveedor_user_id_seq'::regclass);


--
-- TOC entry 3892 (class 2604 OID 87561)
-- Name: market_proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedores ALTER COLUMN id SET DEFAULT nextval('public.market_proveedores_id_seq'::regclass);


--
-- TOC entry 3902 (class 2604 OID 87614)
-- Name: market_unidades_medida id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_unidades_medida ALTER COLUMN id SET DEFAULT nextval('public.market_unidades_medida_id_seq'::regclass);


--
-- TOC entry 3677 (class 2604 OID 51704)
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- TOC entry 3732 (class 2604 OID 86179)
-- Name: modalidad_contrato id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modalidad_contrato ALTER COLUMN id SET DEFAULT nextval('public.modalidad_contrato_id_seq'::regclass);


--
-- TOC entry 3859 (class 2604 OID 87209)
-- Name: motivos_ausencia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia ALTER COLUMN id SET DEFAULT nextval('public.motivos_ausencia_id_seq'::regclass);


--
-- TOC entry 3753 (class 2604 OID 86383)
-- Name: nomina_concepto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto ALTER COLUMN id SET DEFAULT nextval('public.nomina_concepto_id_seq'::regclass);


--
-- TOC entry 3792 (class 2604 OID 86552)
-- Name: nomina_cosecha_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref ALTER COLUMN id SET DEFAULT nextval('public.nomina_cosecha_ref_id_seq'::regclass);


--
-- TOC entry 3770 (class 2604 OID 86460)
-- Name: nomina_empleado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado ALTER COLUMN id SET DEFAULT nextval('public.nomina_empleado_id_seq'::regclass);


--
-- TOC entry 3787 (class 2604 OID 86498)
-- Name: nomina_empleado_concepto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto ALTER COLUMN id SET DEFAULT nextval('public.nomina_empleado_concepto_id_seq'::regclass);


--
-- TOC entry 3879 (class 2604 OID 87418)
-- Name: nomina_hora_extra_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref ALTER COLUMN id SET DEFAULT nextval('public.nomina_hora_extra_ref_id_seq'::regclass);


--
-- TOC entry 3790 (class 2604 OID 86526)
-- Name: nomina_jornal_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref ALTER COLUMN id SET DEFAULT nextval('public.nomina_jornal_ref_id_seq'::regclass);


--
-- TOC entry 3759 (class 2604 OID 86411)
-- Name: nomina_tabla_legal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal ALTER COLUMN id SET DEFAULT nextval('public.nomina_tabla_legal_id_seq'::regclass);


--
-- TOC entry 3762 (class 2604 OID 86431)
-- Name: nominas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas ALTER COLUMN id SET DEFAULT nextval('public.nominas_id_seq'::regclass);


--
-- TOC entry 3834 (class 2604 OID 86863)
-- Name: operaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones ALTER COLUMN id SET DEFAULT nextval('public.operaciones_id_seq'::regclass);


--
-- TOC entry 3721 (class 2604 OID 86062)
-- Name: palmas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas ALTER COLUMN id SET DEFAULT nextval('public.palmas_id_seq'::regclass);


--
-- TOC entry 3824 (class 2604 OID 86709)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 3727 (class 2604 OID 86137)
-- Name: precio_abono id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_abono ALTER COLUMN id SET DEFAULT nextval('public.precio_abono_id_seq'::regclass);


--
-- TOC entry 3724 (class 2604 OID 86103)
-- Name: precio_cosecha id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha ALTER COLUMN id SET DEFAULT nextval('public.precio_cosecha_id_seq'::regclass);


--
-- TOC entry 3854 (class 2604 OID 87133)
-- Name: precios_palma id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma ALTER COLUMN id SET DEFAULT nextval('public.precios_palma_id_seq'::regclass);


--
-- TOC entry 3709 (class 2604 OID 85948)
-- Name: predios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios ALTER COLUMN id SET DEFAULT nextval('public.predios_id_seq'::regclass);


--
-- TOC entry 3723 (class 2604 OID 86083)
-- Name: promedio_lote id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote ALTER COLUMN id SET DEFAULT nextval('public.promedio_lote_id_seq'::regclass);


--
-- TOC entry 3832 (class 2604 OID 86831)
-- Name: pulse_aggregates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_aggregates ALTER COLUMN id SET DEFAULT nextval('public.pulse_aggregates_id_seq'::regclass);


--
-- TOC entry 3830 (class 2604 OID 86817)
-- Name: pulse_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_entries ALTER COLUMN id SET DEFAULT nextval('public.pulse_entries_id_seq'::regclass);


--
-- TOC entry 3828 (class 2604 OID 86803)
-- Name: pulse_values id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_values ALTER COLUMN id SET DEFAULT nextval('public.pulse_values_id_seq'::regclass);


--
-- TOC entry 3745 (class 2604 OID 86305)
-- Name: registro_cosecha id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha ALTER COLUMN id SET DEFAULT nextval('public.registro_cosecha_id_seq'::regclass);


--
-- TOC entry 3825 (class 2604 OID 86720)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3715 (class 2604 OID 85996)
-- Name: semilla_lote id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote ALTER COLUMN id SET DEFAULT nextval('public.semilla_lote_id_seq'::regclass);


--
-- TOC entry 3711 (class 2604 OID 85962)
-- Name: semillas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semillas ALTER COLUMN id SET DEFAULT nextval('public.semillas_id_seq'::regclass);


--
-- TOC entry 3716 (class 2604 OID 86021)
-- Name: sublotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes ALTER COLUMN id SET DEFAULT nextval('public.sublotes_id_seq'::regclass);


--
-- TOC entry 3826 (class 2604 OID 86771)
-- Name: telescope_entries sequence; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries ALTER COLUMN sequence SET DEFAULT nextval('public.telescope_entries_sequence_seq'::regclass);


--
-- TOC entry 3684 (class 2604 OID 85842)
-- Name: tenant_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config ALTER COLUMN id SET DEFAULT nextval('public.tenant_config_id_seq'::regclass);


--
-- TOC entry 3705 (class 2604 OID 85904)
-- Name: tenant_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user ALTER COLUMN id SET DEFAULT nextval('public.tenant_user_id_seq'::regclass);


--
-- TOC entry 3678 (class 2604 OID 85783)
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- TOC entry 3871 (class 2604 OID 87341)
-- Name: tipos_hora_extra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra ALTER COLUMN id SET DEFAULT nextval('public.tipos_hora_extra_id_seq'::regclass);


--
-- TOC entry 3867 (class 2604 OID 87254)
-- Name: transportadores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores ALTER COLUMN id SET DEFAULT nextval('public.transportadores_id_seq'::regclass);


--
-- TOC entry 3681 (class 2604 OID 85799)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3800 (class 2604 OID 86615)
-- Name: vacacion_acumulado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado ALTER COLUMN id SET DEFAULT nextval('public.vacacion_acumulado_id_seq'::regclass);


--
-- TOC entry 3794 (class 2604 OID 86578)
-- Name: vacaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones ALTER COLUMN id SET DEFAULT nextval('public.vacaciones_id_seq'::regclass);


--
-- TOC entry 3748 (class 2604 OID 86334)
-- Name: viaje_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle ALTER COLUMN id SET DEFAULT nextval('public.viaje_detalle_id_seq'::regclass);


--
-- TOC entry 3881 (class 2604 OID 87445)
-- Name: viaje_documento_bascula id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula ALTER COLUMN id SET DEFAULT nextval('public.viaje_documento_bascula_id_seq'::regclass);


--
-- TOC entry 3740 (class 2604 OID 86283)
-- Name: viajes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes ALTER COLUMN id SET DEFAULT nextval('public.viajes_id_seq'::regclass);


--
-- TOC entry 4245 (class 2606 OID 87108)
-- Name: agro_chat_messages agro_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4242 (class 2606 OID 87087)
-- Name: agro_chat_sessions agro_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions
    ADD CONSTRAINT agro_chat_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4314 (class 2606 OID 87509)
-- Name: arl arl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl
    ADD CONSTRAINT arl_pkey PRIMARY KEY (id);


--
-- TOC entry 4317 (class 2606 OID 87516)
-- Name: arl arl_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl
    ADD CONSTRAINT arl_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4018 (class 2606 OID 85930)
-- Name: auditorias auditorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_pkey PRIMARY KEY (id);


--
-- TOC entry 4232 (class 2606 OID 87006)
-- Name: ausencias ausencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_pkey PRIMARY KEY (id);


--
-- TOC entry 4234 (class 2606 OID 87043)
-- Name: ausencias ausencias_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 3996 (class 2606 OID 85836)
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- TOC entry 3993 (class 2606 OID 85828)
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- TOC entry 4076 (class 2606 OID 86197)
-- Name: cargos cargos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_pkey PRIMARY KEY (id);


--
-- TOC entry 4108 (class 2606 OID 86361)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_pkey PRIMARY KEY (id);


--
-- TOC entry 4211 (class 2606 OID 86847)
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (codigo);


--
-- TOC entry 4222 (class 2606 OID 86937)
-- Name: empleado_contratos empleado_contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos
    ADD CONSTRAINT empleado_contratos_pkey PRIMARY KEY (id);


--
-- TOC entry 4227 (class 2606 OID 86970)
-- Name: empleado_documentos empleado_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_pkey PRIMARY KEY (id);


--
-- TOC entry 4079 (class 2606 OID 86221)
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id);


--
-- TOC entry 4266 (class 2606 OID 87241)
-- Name: empresa_transportadora empresa_transportadora_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora
    ADD CONSTRAINT empresa_transportadora_pkey PRIMARY KEY (id);


--
-- TOC entry 4269 (class 2606 OID 87248)
-- Name: empresa_transportadora empresa_transportadora_tenant_id_nit_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora
    ADD CONSTRAINT empresa_transportadora_tenant_id_nit_unique UNIQUE (tenant_id, nit);


--
-- TOC entry 4319 (class 2606 OID 87525)
-- Name: entidades_bancarias entidades_bancarias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias
    ADD CONSTRAINT entidades_bancarias_pkey PRIMARY KEY (id);


--
-- TOC entry 4322 (class 2606 OID 87532)
-- Name: entidades_bancarias entidades_bancarias_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias
    ADD CONSTRAINT entidades_bancarias_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4304 (class 2606 OID 87477)
-- Name: eps eps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps
    ADD CONSTRAINT eps_pkey PRIMARY KEY (id);


--
-- TOC entry 4307 (class 2606 OID 87484)
-- Name: eps eps_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps
    ADD CONSTRAINT eps_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4277 (class 2606 OID 87283)
-- Name: extractoras extractoras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_pkey PRIMARY KEY (id);


--
-- TOC entry 4280 (class 2606 OID 87300)
-- Name: extractoras extractoras_tenant_id_nit_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_tenant_id_nit_unique UNIQUE (tenant_id, nit);


--
-- TOC entry 4007 (class 2606 OID 85895)
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4009 (class 2606 OID 85897)
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- TOC entry 4309 (class 2606 OID 87493)
-- Name: fondos_pension fondos_pension_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension
    ADD CONSTRAINT fondos_pension_pkey PRIMARY KEY (id);


--
-- TOC entry 4312 (class 2606 OID 87500)
-- Name: fondos_pension fondos_pension_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension
    ADD CONSTRAINT fondos_pension_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4287 (class 2606 OID 87370)
-- Name: horas_extra horas_extra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_pkey PRIMARY KEY (id);


--
-- TOC entry 4289 (class 2606 OID 87411)
-- Name: horas_extra horas_extra_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 4060 (class 2606 OID 86126)
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- TOC entry 4063 (class 2606 OID 87536)
-- Name: insumos insumos_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4005 (class 2606 OID 85885)
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 4002 (class 2606 OID 85877)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4254 (class 2606 OID 87159)
-- Name: jornales jornales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_pkey PRIMARY KEY (id);


--
-- TOC entry 4256 (class 2606 OID 87199)
-- Name: jornales jornales_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 4068 (class 2606 OID 86163)
-- Name: labores labores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores
    ADD CONSTRAINT labores_pkey PRIMARY KEY (id);


--
-- TOC entry 4071 (class 2606 OID 87128)
-- Name: labores labores_tenant_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores
    ADD CONSTRAINT labores_tenant_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4039 (class 2606 OID 86044)
-- Name: lineas lineas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_pkey PRIMARY KEY (id);


--
-- TOC entry 4041 (class 2606 OID 86057)
-- Name: lineas lineas_sublote_id_numero_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_sublote_id_numero_unique UNIQUE (sublote_id, numero);


--
-- TOC entry 4156 (class 2606 OID 86688)
-- Name: liquidacion_detalle liquidacion_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_pkey PRIMARY KEY (id);


--
-- TOC entry 4152 (class 2606 OID 86658)
-- Name: liquidaciones liquidaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4027 (class 2606 OID 85979)
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- TOC entry 4359 (class 2606 OID 87719)
-- Name: market_carrito_items market_carrito_items_carrito_id_producto_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carrito_items
    ADD CONSTRAINT market_carrito_items_carrito_id_producto_id_unique UNIQUE (carrito_id, producto_id);


--
-- TOC entry 4361 (class 2606 OID 87707)
-- Name: market_carrito_items market_carrito_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carrito_items
    ADD CONSTRAINT market_carrito_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4355 (class 2606 OID 87693)
-- Name: market_carritos market_carritos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carritos
    ADD CONSTRAINT market_carritos_pkey PRIMARY KEY (id);


--
-- TOC entry 4357 (class 2606 OID 87700)
-- Name: market_carritos market_carritos_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carritos
    ADD CONSTRAINT market_carritos_tenant_id_unique UNIQUE (tenant_id);


--
-- TOC entry 4335 (class 2606 OID 87607)
-- Name: market_categorias market_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_categorias
    ADD CONSTRAINT market_categorias_pkey PRIMARY KEY (id);


--
-- TOC entry 4337 (class 2606 OID 87609)
-- Name: market_categorias market_categorias_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_categorias
    ADD CONSTRAINT market_categorias_slug_unique UNIQUE (slug);


--
-- TOC entry 4374 (class 2606 OID 87779)
-- Name: market_pedido_estados_historial market_pedido_estados_historial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_estados_historial
    ADD CONSTRAINT market_pedido_estados_historial_pkey PRIMARY KEY (id);


--
-- TOC entry 4371 (class 2606 OID 87757)
-- Name: market_pedido_items market_pedido_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_items
    ADD CONSTRAINT market_pedido_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4363 (class 2606 OID 87748)
-- Name: market_pedidos market_pedidos_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedidos
    ADD CONSTRAINT market_pedidos_codigo_unique UNIQUE (codigo);


--
-- TOC entry 4366 (class 2606 OID 87733)
-- Name: market_pedidos market_pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedidos
    ADD CONSTRAINT market_pedidos_pkey PRIMARY KEY (id);


--
-- TOC entry 4352 (class 2606 OID 87680)
-- Name: market_precios_volumen market_precios_volumen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_precios_volumen
    ADD CONSTRAINT market_precios_volumen_pkey PRIMARY KEY (id);


--
-- TOC entry 4350 (class 2606 OID 87667)
-- Name: market_producto_imagenes market_producto_imagenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_producto_imagenes
    ADD CONSTRAINT market_producto_imagenes_pkey PRIMARY KEY (id);


--
-- TOC entry 4345 (class 2606 OID 87636)
-- Name: market_productos market_productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_productos
    ADD CONSTRAINT market_productos_pkey PRIMARY KEY (id);


--
-- TOC entry 4348 (class 2606 OID 87656)
-- Name: market_productos market_productos_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_productos
    ADD CONSTRAINT market_productos_sku_unique UNIQUE (sku);


--
-- TOC entry 4330 (class 2606 OID 87583)
-- Name: market_proveedor_user market_proveedor_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedor_user
    ADD CONSTRAINT market_proveedor_user_pkey PRIMARY KEY (id);


--
-- TOC entry 4332 (class 2606 OID 87595)
-- Name: market_proveedor_user market_proveedor_user_proveedor_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedor_user
    ADD CONSTRAINT market_proveedor_user_proveedor_id_user_id_unique UNIQUE (proveedor_id, user_id);


--
-- TOC entry 4324 (class 2606 OID 87573)
-- Name: market_proveedores market_proveedores_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedores
    ADD CONSTRAINT market_proveedores_email_unique UNIQUE (email);


--
-- TOC entry 4326 (class 2606 OID 87571)
-- Name: market_proveedores market_proveedores_nit_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedores
    ADD CONSTRAINT market_proveedores_nit_unique UNIQUE (nit);


--
-- TOC entry 4328 (class 2606 OID 87569)
-- Name: market_proveedores market_proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedores
    ADD CONSTRAINT market_proveedores_pkey PRIMARY KEY (id);


--
-- TOC entry 4339 (class 2606 OID 87619)
-- Name: market_unidades_medida market_unidades_medida_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_unidades_medida
    ADD CONSTRAINT market_unidades_medida_codigo_unique UNIQUE (codigo);


--
-- TOC entry 4341 (class 2606 OID 87617)
-- Name: market_unidades_medida market_unidades_medida_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_unidades_medida
    ADD CONSTRAINT market_unidades_medida_pkey PRIMARY KEY (id);


--
-- TOC entry 3976 (class 2606 OID 51706)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4073 (class 2606 OID 86182)
-- Name: modalidad_contrato modalidad_contrato_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modalidad_contrato
    ADD CONSTRAINT modalidad_contrato_pkey PRIMARY KEY (id);


--
-- TOC entry 4169 (class 2606 OID 86739)
-- Name: model_has_permissions model_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_pkey PRIMARY KEY (tenant_id, permission_id, model_id, model_type);


--
-- TOC entry 4173 (class 2606 OID 86751)
-- Name: model_has_roles model_has_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_pkey PRIMARY KEY (tenant_id, role_id, model_id, model_type);


--
-- TOC entry 4261 (class 2606 OID 87216)
-- Name: motivos_ausencia motivos_ausencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia
    ADD CONSTRAINT motivos_ausencia_pkey PRIMARY KEY (id);


--
-- TOC entry 4264 (class 2606 OID 87223)
-- Name: motivos_ausencia motivos_ausencia_tenant_id_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia
    ADD CONSTRAINT motivos_ausencia_tenant_id_nombre_unique UNIQUE (tenant_id, nombre);


--
-- TOC entry 4214 (class 2606 OID 86858)
-- Name: municipios municipios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_pkey PRIMARY KEY (codigo);


--
-- TOC entry 4112 (class 2606 OID 86398)
-- Name: nomina_concepto nomina_concepto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto
    ADD CONSTRAINT nomina_concepto_pkey PRIMARY KEY (id);


--
-- TOC entry 4115 (class 2606 OID 86405)
-- Name: nomina_concepto nomina_concepto_tenant_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto
    ADD CONSTRAINT nomina_concepto_tenant_id_codigo_unique UNIQUE (tenant_id, codigo);


--
-- TOC entry 4140 (class 2606 OID 86573)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_nomina_empleado_id_cosecha_cuadrilla_id_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_nomina_empleado_id_cosecha_cuadrilla_id_uniq UNIQUE (nomina_empleado_id, cosecha_cuadrilla_id);


--
-- TOC entry 4142 (class 2606 OID 86555)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 4132 (class 2606 OID 86505)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_pkey PRIMARY KEY (id);


--
-- TOC entry 4126 (class 2606 OID 86493)
-- Name: nomina_empleado nomina_empleado_nomina_id_empleado_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_nomina_id_empleado_id_unique UNIQUE (nomina_id, empleado_id);


--
-- TOC entry 4128 (class 2606 OID 86474)
-- Name: nomina_empleado nomina_empleado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_pkey PRIMARY KEY (id);


--
-- TOC entry 4295 (class 2606 OID 87439)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_nomina_empleado_id_hora_extra_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_nomina_empleado_id_hora_extra_id_unique UNIQUE (nomina_empleado_id, hora_extra_id);


--
-- TOC entry 4297 (class 2606 OID 87421)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 4135 (class 2606 OID 86547)
-- Name: nomina_jornal_ref nomina_jornal_ref_nomina_empleado_id_jornal_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_nomina_empleado_id_jornal_id_unique UNIQUE (nomina_empleado_id, jornal_id);


--
-- TOC entry 4137 (class 2606 OID 86529)
-- Name: nomina_jornal_ref nomina_jornal_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 4117 (class 2606 OID 86415)
-- Name: nomina_tabla_legal nomina_tabla_legal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal
    ADD CONSTRAINT nomina_tabla_legal_pkey PRIMARY KEY (id);


--
-- TOC entry 4120 (class 2606 OID 86443)
-- Name: nominas nominas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_pkey PRIMARY KEY (id);


--
-- TOC entry 4124 (class 2606 OID 87544)
-- Name: nominas nominas_tenant_periodo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_tenant_periodo_unique UNIQUE (tenant_id, anio, mes, quincena);


--
-- TOC entry 4216 (class 2606 OID 86870)
-- Name: operaciones operaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4220 (class 2606 OID 86889)
-- Name: operaciones operaciones_tenant_id_fecha_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_tenant_id_fecha_unique UNIQUE (tenant_id, fecha);


--
-- TOC entry 4045 (class 2606 OID 86065)
-- Name: palmas palmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_pkey PRIMARY KEY (id);


--
-- TOC entry 4047 (class 2606 OID 86078)
-- Name: palmas palmas_sublote_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_sublote_id_codigo_unique UNIQUE (sublote_id, codigo);


--
-- TOC entry 3986 (class 2606 OID 85812)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- TOC entry 4159 (class 2606 OID 86715)
-- Name: permissions permissions_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name);


--
-- TOC entry 4161 (class 2606 OID 86713)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4065 (class 2606 OID 86140)
-- Name: precio_abono precio_abono_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_abono
    ADD CONSTRAINT precio_abono_pkey PRIMARY KEY (id);


--
-- TOC entry 4055 (class 2606 OID 86117)
-- Name: precio_cosecha precio_cosecha_lote_id_anio_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_lote_id_anio_unique UNIQUE (lote_id, anio);


--
-- TOC entry 4057 (class 2606 OID 86105)
-- Name: precio_cosecha precio_cosecha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_pkey PRIMARY KEY (id);


--
-- TOC entry 4249 (class 2606 OID 87137)
-- Name: precios_palma precios_palma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma
    ADD CONSTRAINT precios_palma_pkey PRIMARY KEY (id);


--
-- TOC entry 4252 (class 2606 OID 87144)
-- Name: precios_palma precios_palma_tenant_tipo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma
    ADD CONSTRAINT precios_palma_tenant_tipo_unique UNIQUE (tenant_id, tipo);


--
-- TOC entry 4021 (class 2606 OID 85951)
-- Name: predios predios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios
    ADD CONSTRAINT predios_pkey PRIMARY KEY (id);


--
-- TOC entry 4050 (class 2606 OID 86097)
-- Name: promedio_lote promedio_lote_lote_id_anio_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_lote_id_anio_unique UNIQUE (lote_id, anio);


--
-- TOC entry 4052 (class 2606 OID 86085)
-- Name: promedio_lote promedio_lote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_pkey PRIMARY KEY (id);


--
-- TOC entry 4203 (class 2606 OID 86838)
-- Name: pulse_aggregates pulse_aggregates_bucket_period_type_aggregate_key_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_aggregates
    ADD CONSTRAINT pulse_aggregates_bucket_period_type_aggregate_key_hash_unique UNIQUE (bucket, period, type, aggregate, key_hash);


--
-- TOC entry 4207 (class 2606 OID 86836)
-- Name: pulse_aggregates pulse_aggregates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_aggregates
    ADD CONSTRAINT pulse_aggregates_pkey PRIMARY KEY (id);


--
-- TOC entry 4198 (class 2606 OID 86822)
-- Name: pulse_entries pulse_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_entries
    ADD CONSTRAINT pulse_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4191 (class 2606 OID 86808)
-- Name: pulse_values pulse_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_values
    ADD CONSTRAINT pulse_values_pkey PRIMARY KEY (id);


--
-- TOC entry 4195 (class 2606 OID 86812)
-- Name: pulse_values pulse_values_type_key_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pulse_values
    ADD CONSTRAINT pulse_values_type_key_hash_unique UNIQUE (type, key_hash);


--
-- TOC entry 4097 (class 2606 OID 86310)
-- Name: registro_cosecha registro_cosecha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_pkey PRIMARY KEY (id);


--
-- TOC entry 4099 (class 2606 OID 86329)
-- Name: registro_cosecha registro_cosecha_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 4176 (class 2606 OID 86766)
-- Name: role_has_permissions role_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id);


--
-- TOC entry 4163 (class 2606 OID 86724)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4166 (class 2606 OID 86727)
-- Name: roles roles_tenant_id_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_name_guard_name_unique UNIQUE (tenant_id, name, guard_name);


--
-- TOC entry 4031 (class 2606 OID 86015)
-- Name: semilla_lote semilla_lote_lote_id_semilla_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_lote_id_semilla_id_unique UNIQUE (lote_id, semilla_id);


--
-- TOC entry 4033 (class 2606 OID 85998)
-- Name: semilla_lote semilla_lote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_pkey PRIMARY KEY (id);


--
-- TOC entry 4024 (class 2606 OID 85965)
-- Name: semillas semillas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semillas
    ADD CONSTRAINT semillas_pkey PRIMARY KEY (id);


--
-- TOC entry 3989 (class 2606 OID 85819)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4036 (class 2606 OID 86024)
-- Name: sublotes sublotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes
    ADD CONSTRAINT sublotes_pkey PRIMARY KEY (id);


--
-- TOC entry 4181 (class 2606 OID 86776)
-- Name: telescope_entries telescope_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries
    ADD CONSTRAINT telescope_entries_pkey PRIMARY KEY (sequence);


--
-- TOC entry 4186 (class 2606 OID 86787)
-- Name: telescope_entries_tags telescope_entries_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries_tags
    ADD CONSTRAINT telescope_entries_tags_pkey PRIMARY KEY (entry_uuid, tag);


--
-- TOC entry 4184 (class 2606 OID 86778)
-- Name: telescope_entries telescope_entries_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries
    ADD CONSTRAINT telescope_entries_uuid_unique UNIQUE (uuid);


--
-- TOC entry 4189 (class 2606 OID 86798)
-- Name: telescope_monitoring telescope_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_monitoring
    ADD CONSTRAINT telescope_monitoring_pkey PRIMARY KEY (tag);


--
-- TOC entry 3998 (class 2606 OID 85861)
-- Name: tenant_config tenant_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config
    ADD CONSTRAINT tenant_config_pkey PRIMARY KEY (id);


--
-- TOC entry 4000 (class 2606 OID 85868)
-- Name: tenant_config tenant_config_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config
    ADD CONSTRAINT tenant_config_tenant_id_unique UNIQUE (tenant_id);


--
-- TOC entry 4011 (class 2606 OID 85908)
-- Name: tenant_user tenant_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_pkey PRIMARY KEY (id);


--
-- TOC entry 4013 (class 2606 OID 85920)
-- Name: tenant_user tenant_user_tenant_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_tenant_id_user_id_unique UNIQUE (tenant_id, user_id);


--
-- TOC entry 3978 (class 2606 OID 85794)
-- Name: tenants tenants_nit_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_nit_unique UNIQUE (nit);


--
-- TOC entry 3980 (class 2606 OID 85792)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 4282 (class 2606 OID 87347)
-- Name: tipos_hora_extra tipos_hora_extra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra
    ADD CONSTRAINT tipos_hora_extra_pkey PRIMARY KEY (id);


--
-- TOC entry 4284 (class 2606 OID 87354)
-- Name: tipos_hora_extra tipos_hora_extra_tenant_id_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra
    ADD CONSTRAINT tipos_hora_extra_tenant_id_codigo_unique UNIQUE (tenant_id, codigo);


--
-- TOC entry 4271 (class 2606 OID 87259)
-- Name: transportadores transportadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_pkey PRIMARY KEY (id);


--
-- TOC entry 4275 (class 2606 OID 87271)
-- Name: transportadores transportadores_tenant_id_placa_vehiculo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_tenant_id_placa_vehiculo_unique UNIQUE (tenant_id, placa_vehiculo);


--
-- TOC entry 3982 (class 2606 OID 85805)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 3984 (class 2606 OID 85803)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4149 (class 2606 OID 86621)
-- Name: vacacion_acumulado vacacion_acumulado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado
    ADD CONSTRAINT vacacion_acumulado_pkey PRIMARY KEY (id);


--
-- TOC entry 4145 (class 2606 OID 86588)
-- Name: vacaciones vacaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4104 (class 2606 OID 86337)
-- Name: viaje_detalle viaje_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_pkey PRIMARY KEY (id);


--
-- TOC entry 4300 (class 2606 OID 87451)
-- Name: viaje_documento_bascula viaje_documento_bascula_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_pkey PRIMARY KEY (id);


--
-- TOC entry 4085 (class 2606 OID 86291)
-- Name: viajes viajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_pkey PRIMARY KEY (id);


--
-- TOC entry 4087 (class 2606 OID 86300)
-- Name: viajes viajes_sync_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_sync_uuid_unique UNIQUE (sync_uuid);


--
-- TOC entry 4094 (class 2606 OID 87325)
-- Name: viajes viajes_tenant_id_remision_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_tenant_id_remision_unique UNIQUE (tenant_id, remision);


--
-- TOC entry 4315 (class 1259 OID 87517)
-- Name: arl_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX arl_tenant_id_estado_index ON public.arl USING btree (tenant_id, estado);


--
-- TOC entry 4015 (class 1259 OID 85942)
-- Name: auditorias_accion_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditorias_accion_index ON public.auditorias USING btree (accion);


--
-- TOC entry 4016 (class 1259 OID 85943)
-- Name: auditorias_modulo_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditorias_modulo_index ON public.auditorias USING btree (modulo);


--
-- TOC entry 4019 (class 1259 OID 85941)
-- Name: auditorias_tenant_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditorias_tenant_id_created_at_index ON public.auditorias USING btree (tenant_id, created_at);


--
-- TOC entry 4235 (class 1259 OID 87038)
-- Name: ausencias_tenant_id_empleado_id_fecha_inicio_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_empleado_id_fecha_inicio_index ON public.ausencias USING btree (tenant_id, empleado_id, fecha_inicio);


--
-- TOC entry 4236 (class 1259 OID 87040)
-- Name: ausencias_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_estado_index ON public.ausencias USING btree (tenant_id, estado);


--
-- TOC entry 4237 (class 1259 OID 87039)
-- Name: ausencias_tenant_id_fecha_inicio_fecha_fin_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_fecha_inicio_fecha_fin_index ON public.ausencias USING btree (tenant_id, fecha_inicio, fecha_fin);


--
-- TOC entry 4238 (class 1259 OID 87231)
-- Name: ausencias_tenant_id_motivo_ausencia_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_motivo_ausencia_id_index ON public.ausencias USING btree (tenant_id, motivo_ausencia_id);


--
-- TOC entry 4239 (class 1259 OID 87041)
-- Name: ausencias_tenant_id_nomina_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_nomina_id_index ON public.ausencias USING btree (tenant_id, nomina_id);


--
-- TOC entry 4240 (class 1259 OID 87037)
-- Name: ausencias_tenant_id_operacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ausencias_tenant_id_operacion_id_index ON public.ausencias USING btree (tenant_id, operacion_id);


--
-- TOC entry 3991 (class 1259 OID 85829)
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- TOC entry 3994 (class 1259 OID 85837)
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- TOC entry 4077 (class 1259 OID 86208)
-- Name: cargos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cargos_tenant_id_estado_index ON public.cargos USING btree (tenant_id, estado);


--
-- TOC entry 4109 (class 1259 OID 86377)
-- Name: cosecha_cuadrilla_tenant_id_cosecha_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cosecha_cuadrilla_tenant_id_cosecha_id_index ON public.cosecha_cuadrilla USING btree (tenant_id, cosecha_id);


--
-- TOC entry 4110 (class 1259 OID 86378)
-- Name: cosecha_cuadrilla_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cosecha_cuadrilla_tenant_id_empleado_id_index ON public.cosecha_cuadrilla USING btree (tenant_id, empleado_id);


--
-- TOC entry 4209 (class 1259 OID 86845)
-- Name: departamentos_nombre_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX departamentos_nombre_index ON public.departamentos USING btree (nombre);


--
-- TOC entry 4223 (class 1259 OID 86959)
-- Name: empleado_contratos_tenant_id_empleado_id_estado_contrato_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_contratos_tenant_id_empleado_id_estado_contrato_index ON public.empleado_contratos USING btree (tenant_id, empleado_id, estado_contrato);


--
-- TOC entry 4224 (class 1259 OID 86958)
-- Name: empleado_contratos_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_contratos_tenant_id_empleado_id_index ON public.empleado_contratos USING btree (tenant_id, empleado_id);


--
-- TOC entry 4225 (class 1259 OID 86960)
-- Name: empleado_contratos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_contratos_tenant_id_estado_index ON public.empleado_contratos USING btree (tenant_id, estado);


--
-- TOC entry 4228 (class 1259 OID 86987)
-- Name: empleado_documentos_tenant_id_empleado_id_categoria_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_documentos_tenant_id_empleado_id_categoria_index ON public.empleado_documentos USING btree (tenant_id, empleado_id, categoria);


--
-- TOC entry 4229 (class 1259 OID 86986)
-- Name: empleado_documentos_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_documentos_tenant_id_empleado_id_index ON public.empleado_documentos USING btree (tenant_id, empleado_id);


--
-- TOC entry 4230 (class 1259 OID 86988)
-- Name: empleado_documentos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleado_documentos_tenant_id_estado_index ON public.empleado_documentos USING btree (tenant_id, estado);


--
-- TOC entry 4080 (class 1259 OID 87534)
-- Name: empleados_tenant_doc_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX empleados_tenant_doc_active_unique ON public.empleados USING btree (tenant_id, documento) WHERE (deleted_at IS NULL);


--
-- TOC entry 4081 (class 1259 OID 86234)
-- Name: empleados_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleados_tenant_id_estado_index ON public.empleados USING btree (tenant_id, estado);


--
-- TOC entry 4082 (class 1259 OID 87078)
-- Name: empleados_tenant_id_modalidad_pago_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleados_tenant_id_modalidad_pago_index ON public.empleados USING btree (tenant_id, modalidad_pago);


--
-- TOC entry 4083 (class 1259 OID 87079)
-- Name: empleados_tenant_id_predio_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empleados_tenant_id_predio_id_index ON public.empleados USING btree (tenant_id, predio_id);


--
-- TOC entry 4267 (class 1259 OID 87249)
-- Name: empresa_transportadora_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX empresa_transportadora_tenant_id_estado_index ON public.empresa_transportadora USING btree (tenant_id, estado);


--
-- TOC entry 4320 (class 1259 OID 87533)
-- Name: entidades_bancarias_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entidades_bancarias_tenant_id_estado_index ON public.entidades_bancarias USING btree (tenant_id, estado);


--
-- TOC entry 4305 (class 1259 OID 87485)
-- Name: eps_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eps_tenant_id_estado_index ON public.eps USING btree (tenant_id, estado);


--
-- TOC entry 4278 (class 1259 OID 87301)
-- Name: extractoras_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX extractoras_tenant_id_estado_index ON public.extractoras USING btree (tenant_id, estado);


--
-- TOC entry 4310 (class 1259 OID 87501)
-- Name: fondos_pension_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fondos_pension_tenant_id_estado_index ON public.fondos_pension USING btree (tenant_id, estado);


--
-- TOC entry 4290 (class 1259 OID 87407)
-- Name: horas_extra_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_empleado_id_index ON public.horas_extra USING btree (tenant_id, empleado_id);


--
-- TOC entry 4291 (class 1259 OID 87408)
-- Name: horas_extra_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_estado_index ON public.horas_extra USING btree (tenant_id, estado);


--
-- TOC entry 4292 (class 1259 OID 87409)
-- Name: horas_extra_tenant_id_nomina_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_nomina_id_index ON public.horas_extra USING btree (tenant_id, nomina_id);


--
-- TOC entry 4293 (class 1259 OID 87406)
-- Name: horas_extra_tenant_id_operacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX horas_extra_tenant_id_operacion_id_index ON public.horas_extra USING btree (tenant_id, operacion_id);


--
-- TOC entry 4246 (class 1259 OID 87124)
-- Name: idx_agro_chat_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agro_chat_messages_session ON public.agro_chat_messages USING btree (session_id, created_at);


--
-- TOC entry 4247 (class 1259 OID 87125)
-- Name: idx_agro_chat_messages_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agro_chat_messages_user ON public.agro_chat_messages USING btree (user_id, created_at);


--
-- TOC entry 4243 (class 1259 OID 87098)
-- Name: idx_agro_chat_sessions_user_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agro_chat_sessions_user_tenant ON public.agro_chat_sessions USING btree (user_id, tenant_id, updated_at);


--
-- TOC entry 4061 (class 1259 OID 86132)
-- Name: insumos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX insumos_tenant_id_estado_index ON public.insumos USING btree (tenant_id, estado);


--
-- TOC entry 4003 (class 1259 OID 85878)
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- TOC entry 4257 (class 1259 OID 87196)
-- Name: jornales_tenant_id_categoria_tipo_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jornales_tenant_id_categoria_tipo_index ON public.jornales USING btree (tenant_id, categoria, tipo);


--
-- TOC entry 4258 (class 1259 OID 87197)
-- Name: jornales_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jornales_tenant_id_estado_index ON public.jornales USING btree (tenant_id, estado);


--
-- TOC entry 4259 (class 1259 OID 87195)
-- Name: jornales_tenant_id_operacion_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jornales_tenant_id_operacion_id_empleado_id_index ON public.jornales USING btree (tenant_id, operacion_id, empleado_id);


--
-- TOC entry 4069 (class 1259 OID 86174)
-- Name: labores_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX labores_tenant_id_estado_index ON public.labores USING btree (tenant_id, estado);


--
-- TOC entry 4042 (class 1259 OID 86055)
-- Name: lineas_tenant_id_sublote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lineas_tenant_id_sublote_id_index ON public.lineas USING btree (tenant_id, sublote_id);


--
-- TOC entry 4157 (class 1259 OID 86704)
-- Name: liquidacion_detalle_tenant_id_liquidacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX liquidacion_detalle_tenant_id_liquidacion_id_index ON public.liquidacion_detalle USING btree (tenant_id, liquidacion_id);


--
-- TOC entry 4153 (class 1259 OID 86674)
-- Name: liquidaciones_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX liquidaciones_tenant_id_empleado_id_index ON public.liquidaciones USING btree (tenant_id, empleado_id);


--
-- TOC entry 4154 (class 1259 OID 86675)
-- Name: liquidaciones_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX liquidaciones_tenant_id_estado_index ON public.liquidaciones USING btree (tenant_id, estado);


--
-- TOC entry 4028 (class 1259 OID 85991)
-- Name: lotes_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lotes_tenant_id_estado_index ON public.lotes USING btree (tenant_id, estado);


--
-- TOC entry 4029 (class 1259 OID 85990)
-- Name: lotes_tenant_id_predio_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lotes_tenant_id_predio_id_index ON public.lotes USING btree (tenant_id, predio_id);


--
-- TOC entry 4372 (class 1259 OID 87790)
-- Name: market_pedido_estados_historial_pedido_id_fecha_cambio_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_pedido_estados_historial_pedido_id_fecha_cambio_index ON public.market_pedido_estados_historial USING btree (pedido_id, fecha_cambio);


--
-- TOC entry 4369 (class 1259 OID 87768)
-- Name: market_pedido_items_pedido_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_pedido_items_pedido_id_index ON public.market_pedido_items USING btree (pedido_id);


--
-- TOC entry 4364 (class 1259 OID 87746)
-- Name: market_pedidos_fecha_pedido_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_pedidos_fecha_pedido_index ON public.market_pedidos USING btree (fecha_pedido);


--
-- TOC entry 4367 (class 1259 OID 87745)
-- Name: market_pedidos_proveedor_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_pedidos_proveedor_id_estado_index ON public.market_pedidos USING btree (proveedor_id, estado);


--
-- TOC entry 4368 (class 1259 OID 87744)
-- Name: market_pedidos_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_pedidos_tenant_id_estado_index ON public.market_pedidos USING btree (tenant_id, estado);


--
-- TOC entry 4353 (class 1259 OID 87686)
-- Name: market_precios_volumen_producto_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_precios_volumen_producto_id_index ON public.market_precios_volumen USING btree (producto_id);


--
-- TOC entry 4342 (class 1259 OID 87653)
-- Name: market_productos_categoria_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_productos_categoria_id_index ON public.market_productos USING btree (categoria_id);


--
-- TOC entry 4343 (class 1259 OID 87654)
-- Name: market_productos_nombre_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_productos_nombre_index ON public.market_productos USING btree (nombre);


--
-- TOC entry 4346 (class 1259 OID 87652)
-- Name: market_productos_proveedor_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_productos_proveedor_id_estado_index ON public.market_productos USING btree (proveedor_id, estado);


--
-- TOC entry 4333 (class 1259 OID 87596)
-- Name: market_proveedor_user_user_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX market_proveedor_user_user_id_estado_index ON public.market_proveedor_user USING btree (user_id, estado);


--
-- TOC entry 4074 (class 1259 OID 86188)
-- Name: modalidad_contrato_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX modalidad_contrato_tenant_id_estado_index ON public.modalidad_contrato USING btree (tenant_id, estado);


--
-- TOC entry 4167 (class 1259 OID 86731)
-- Name: model_has_permissions_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_permissions_model_id_model_type_index ON public.model_has_permissions USING btree (model_id, model_type);


--
-- TOC entry 4170 (class 1259 OID 86737)
-- Name: model_has_permissions_team_foreign_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_permissions_team_foreign_key_index ON public.model_has_permissions USING btree (tenant_id);


--
-- TOC entry 4171 (class 1259 OID 86743)
-- Name: model_has_roles_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_roles_model_id_model_type_index ON public.model_has_roles USING btree (model_id, model_type);


--
-- TOC entry 4174 (class 1259 OID 86749)
-- Name: model_has_roles_team_foreign_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_roles_team_foreign_key_index ON public.model_has_roles USING btree (tenant_id);


--
-- TOC entry 4262 (class 1259 OID 87224)
-- Name: motivos_ausencia_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX motivos_ausencia_tenant_id_estado_index ON public.motivos_ausencia USING btree (tenant_id, estado);


--
-- TOC entry 4212 (class 1259 OID 86856)
-- Name: municipios_departamento_codigo_nombre_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX municipios_departamento_codigo_nombre_index ON public.municipios USING btree (departamento_codigo, nombre);


--
-- TOC entry 4113 (class 1259 OID 86406)
-- Name: nomina_concepto_tenant_id_activo_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_concepto_tenant_id_activo_index ON public.nomina_concepto USING btree (tenant_id, activo);


--
-- TOC entry 4143 (class 1259 OID 86571)
-- Name: nomina_cosecha_ref_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_cosecha_ref_tenant_id_nomina_empleado_id_index ON public.nomina_cosecha_ref USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4133 (class 1259 OID 86521)
-- Name: nomina_empleado_concepto_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_empleado_concepto_tenant_id_nomina_empleado_id_index ON public.nomina_empleado_concepto USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4129 (class 1259 OID 86491)
-- Name: nomina_empleado_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_empleado_tenant_id_empleado_id_index ON public.nomina_empleado USING btree (tenant_id, empleado_id);


--
-- TOC entry 4130 (class 1259 OID 86490)
-- Name: nomina_empleado_tenant_id_nomina_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_empleado_tenant_id_nomina_id_index ON public.nomina_empleado USING btree (tenant_id, nomina_id);


--
-- TOC entry 4298 (class 1259 OID 87437)
-- Name: nomina_hora_extra_ref_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_hora_extra_ref_tenant_id_nomina_empleado_id_index ON public.nomina_hora_extra_ref USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4138 (class 1259 OID 86545)
-- Name: nomina_jornal_ref_tenant_id_nomina_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_jornal_ref_tenant_id_nomina_empleado_id_index ON public.nomina_jornal_ref USING btree (tenant_id, nomina_empleado_id);


--
-- TOC entry 4118 (class 1259 OID 86426)
-- Name: nomina_tabla_legal_tenant_id_concepto_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nomina_tabla_legal_tenant_id_concepto_id_index ON public.nomina_tabla_legal USING btree (tenant_id, concepto_id);


--
-- TOC entry 4121 (class 1259 OID 86455)
-- Name: nominas_tenant_id_anio_mes_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nominas_tenant_id_anio_mes_index ON public.nominas USING btree (tenant_id, anio, mes);


--
-- TOC entry 4122 (class 1259 OID 86454)
-- Name: nominas_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nominas_tenant_id_estado_index ON public.nominas USING btree (tenant_id, estado);


--
-- TOC entry 4217 (class 1259 OID 86887)
-- Name: operaciones_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operaciones_tenant_id_estado_index ON public.operaciones USING btree (tenant_id, estado);


--
-- TOC entry 4218 (class 1259 OID 86886)
-- Name: operaciones_tenant_id_fecha_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operaciones_tenant_id_fecha_index ON public.operaciones USING btree (tenant_id, fecha);


--
-- TOC entry 4043 (class 1259 OID 87053)
-- Name: palmas_linea_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX palmas_linea_id_index ON public.palmas USING btree (linea_id);


--
-- TOC entry 4048 (class 1259 OID 86076)
-- Name: palmas_tenant_id_sublote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX palmas_tenant_id_sublote_id_index ON public.palmas USING btree (tenant_id, sublote_id);


--
-- TOC entry 4066 (class 1259 OID 86923)
-- Name: precio_abono_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX precio_abono_tenant_id_estado_index ON public.precio_abono USING btree (tenant_id, estado);


--
-- TOC entry 4058 (class 1259 OID 86118)
-- Name: precio_cosecha_tenant_id_anio_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX precio_cosecha_tenant_id_anio_index ON public.precio_cosecha USING btree (tenant_id, anio);


--
-- TOC entry 4250 (class 1259 OID 87145)
-- Name: precios_palma_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX precios_palma_tenant_id_estado_index ON public.precios_palma USING btree (tenant_id, estado);


--
-- TOC entry 4022 (class 1259 OID 85957)
-- Name: predios_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX predios_tenant_id_estado_index ON public.predios USING btree (tenant_id, estado);


--
-- TOC entry 4053 (class 1259 OID 86098)
-- Name: promedio_lote_tenant_id_anio_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promedio_lote_tenant_id_anio_index ON public.promedio_lote USING btree (tenant_id, anio);


--
-- TOC entry 4204 (class 1259 OID 86839)
-- Name: pulse_aggregates_period_bucket_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_aggregates_period_bucket_index ON public.pulse_aggregates USING btree (period, bucket);


--
-- TOC entry 4205 (class 1259 OID 86841)
-- Name: pulse_aggregates_period_type_aggregate_bucket_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_aggregates_period_type_aggregate_bucket_index ON public.pulse_aggregates USING btree (period, type, aggregate, bucket);


--
-- TOC entry 4208 (class 1259 OID 86840)
-- Name: pulse_aggregates_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_aggregates_type_index ON public.pulse_aggregates USING btree (type);


--
-- TOC entry 4196 (class 1259 OID 86825)
-- Name: pulse_entries_key_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_key_hash_index ON public.pulse_entries USING btree (key_hash);


--
-- TOC entry 4199 (class 1259 OID 86823)
-- Name: pulse_entries_timestamp_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_timestamp_index ON public.pulse_entries USING btree ("timestamp");


--
-- TOC entry 4200 (class 1259 OID 86826)
-- Name: pulse_entries_timestamp_type_key_hash_value_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_timestamp_type_key_hash_value_index ON public.pulse_entries USING btree ("timestamp", type, key_hash, value);


--
-- TOC entry 4201 (class 1259 OID 86824)
-- Name: pulse_entries_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_entries_type_index ON public.pulse_entries USING btree (type);


--
-- TOC entry 4192 (class 1259 OID 86809)
-- Name: pulse_values_timestamp_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_values_timestamp_index ON public.pulse_values USING btree ("timestamp");


--
-- TOC entry 4193 (class 1259 OID 86810)
-- Name: pulse_values_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pulse_values_type_index ON public.pulse_values USING btree (type);


--
-- TOC entry 4100 (class 1259 OID 86327)
-- Name: registro_cosecha_tenant_id_lote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registro_cosecha_tenant_id_lote_id_index ON public.registro_cosecha USING btree (tenant_id, lote_id);


--
-- TOC entry 4101 (class 1259 OID 86901)
-- Name: registro_cosecha_tenant_id_operacion_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registro_cosecha_tenant_id_operacion_id_index ON public.registro_cosecha USING btree (tenant_id, operacion_id);


--
-- TOC entry 4164 (class 1259 OID 86725)
-- Name: roles_team_foreign_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX roles_team_foreign_key_index ON public.roles USING btree (tenant_id);


--
-- TOC entry 4034 (class 1259 OID 86016)
-- Name: semilla_lote_tenant_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX semilla_lote_tenant_id_index ON public.semilla_lote USING btree (tenant_id);


--
-- TOC entry 4025 (class 1259 OID 85971)
-- Name: semillas_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX semillas_tenant_id_estado_index ON public.semillas USING btree (tenant_id, estado);


--
-- TOC entry 3987 (class 1259 OID 85821)
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- TOC entry 3990 (class 1259 OID 85820)
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- TOC entry 4037 (class 1259 OID 86035)
-- Name: sublotes_tenant_id_lote_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sublotes_tenant_id_lote_id_index ON public.sublotes USING btree (tenant_id, lote_id);


--
-- TOC entry 4177 (class 1259 OID 86779)
-- Name: telescope_entries_batch_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_batch_id_index ON public.telescope_entries USING btree (batch_id);


--
-- TOC entry 4178 (class 1259 OID 86781)
-- Name: telescope_entries_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_created_at_index ON public.telescope_entries USING btree (created_at);


--
-- TOC entry 4179 (class 1259 OID 86780)
-- Name: telescope_entries_family_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_family_hash_index ON public.telescope_entries USING btree (family_hash);


--
-- TOC entry 4187 (class 1259 OID 86788)
-- Name: telescope_entries_tags_tag_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_tags_tag_index ON public.telescope_entries_tags USING btree (tag);


--
-- TOC entry 4182 (class 1259 OID 86782)
-- Name: telescope_entries_type_should_display_on_index_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_type_should_display_on_index_index ON public.telescope_entries USING btree (type, should_display_on_index);


--
-- TOC entry 4014 (class 1259 OID 85921)
-- Name: tenant_user_user_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_user_user_id_estado_index ON public.tenant_user USING btree (user_id, estado);


--
-- TOC entry 4285 (class 1259 OID 87355)
-- Name: tipos_hora_extra_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tipos_hora_extra_tenant_id_estado_index ON public.tipos_hora_extra USING btree (tenant_id, estado);


--
-- TOC entry 4272 (class 1259 OID 87272)
-- Name: transportadores_tenant_id_empresa_transportadora_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transportadores_tenant_id_empresa_transportadora_id_index ON public.transportadores USING btree (tenant_id, empresa_transportadora_id);


--
-- TOC entry 4273 (class 1259 OID 87273)
-- Name: transportadores_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transportadores_tenant_id_estado_index ON public.transportadores USING btree (tenant_id, estado);


--
-- TOC entry 4150 (class 1259 OID 86632)
-- Name: vacacion_acumulado_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vacacion_acumulado_tenant_id_empleado_id_index ON public.vacacion_acumulado USING btree (tenant_id, empleado_id);


--
-- TOC entry 4146 (class 1259 OID 86609)
-- Name: vacaciones_tenant_id_empleado_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vacaciones_tenant_id_empleado_id_index ON public.vacaciones USING btree (tenant_id, empleado_id);


--
-- TOC entry 4147 (class 1259 OID 86610)
-- Name: vacaciones_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vacaciones_tenant_id_estado_index ON public.vacaciones USING btree (tenant_id, estado);


--
-- TOC entry 4102 (class 1259 OID 87336)
-- Name: viaje_detalle_cosecha_activa_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX viaje_detalle_cosecha_activa_unique ON public.viaje_detalle USING btree (cosecha_id) WHERE (estado = true);


--
-- TOC entry 4105 (class 1259 OID 87335)
-- Name: viaje_detalle_tenant_id_reconteo_aprobado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_detalle_tenant_id_reconteo_aprobado_index ON public.viaje_detalle USING btree (tenant_id, reconteo_aprobado);


--
-- TOC entry 4106 (class 1259 OID 86353)
-- Name: viaje_detalle_tenant_id_viaje_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_detalle_tenant_id_viaje_id_index ON public.viaje_detalle USING btree (tenant_id, viaje_id);


--
-- TOC entry 4301 (class 1259 OID 87468)
-- Name: viaje_documento_bascula_tenant_id_estado_ocr_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_documento_bascula_tenant_id_estado_ocr_index ON public.viaje_documento_bascula USING btree (tenant_id, estado_ocr);


--
-- TOC entry 4302 (class 1259 OID 87467)
-- Name: viaje_documento_bascula_tenant_id_viaje_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viaje_documento_bascula_tenant_id_viaje_id_index ON public.viaje_documento_bascula USING btree (tenant_id, viaje_id);


--
-- TOC entry 4088 (class 1259 OID 87326)
-- Name: viajes_tenant_id_estado_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_estado_index ON public.viajes USING btree (tenant_id, estado);


--
-- TOC entry 4089 (class 1259 OID 87328)
-- Name: viajes_tenant_id_extractora_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_extractora_id_index ON public.viajes USING btree (tenant_id, extractora_id);


--
-- TOC entry 4090 (class 1259 OID 87538)
-- Name: viajes_tenant_id_fecha_llegada_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_fecha_llegada_index ON public.viajes USING btree (tenant_id, fecha_llegada);


--
-- TOC entry 4091 (class 1259 OID 86297)
-- Name: viajes_tenant_id_fecha_viaje_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_fecha_viaje_index ON public.viajes USING btree (tenant_id, fecha_viaje);


--
-- TOC entry 4092 (class 1259 OID 87556)
-- Name: viajes_tenant_id_numero_remision_extractora_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_numero_remision_extractora_index ON public.viajes USING btree (tenant_id, numero_remision_extractora);


--
-- TOC entry 4095 (class 1259 OID 87327)
-- Name: viajes_tenant_id_transportador_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viajes_tenant_id_transportador_id_index ON public.viajes USING btree (tenant_id, transportador_id);


--
-- TOC entry 4475 (class 2606 OID 87109)
-- Name: agro_chat_messages agro_chat_messages_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_session_id_foreign FOREIGN KEY (session_id) REFERENCES public.agro_chat_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4476 (class 2606 OID 87119)
-- Name: agro_chat_messages agro_chat_messages_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4477 (class 2606 OID 87114)
-- Name: agro_chat_messages agro_chat_messages_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_messages
    ADD CONSTRAINT agro_chat_messages_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4473 (class 2606 OID 87093)
-- Name: agro_chat_sessions agro_chat_sessions_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions
    ADD CONSTRAINT agro_chat_sessions_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4474 (class 2606 OID 87088)
-- Name: agro_chat_sessions agro_chat_sessions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agro_chat_sessions
    ADD CONSTRAINT agro_chat_sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4509 (class 2606 OID 87510)
-- Name: arl arl_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arl
    ADD CONSTRAINT arl_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4378 (class 2606 OID 85931)
-- Name: auditorias auditorias_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- TOC entry 4379 (class 2606 OID 85936)
-- Name: auditorias auditorias_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditorias
    ADD CONSTRAINT auditorias_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4466 (class 2606 OID 87022)
-- Name: ausencias ausencias_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4467 (class 2606 OID 87032)
-- Name: ausencias ausencias_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4468 (class 2606 OID 87017)
-- Name: ausencias ausencias_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE RESTRICT;


--
-- TOC entry 4469 (class 2606 OID 87226)
-- Name: ausencias ausencias_motivo_ausencia_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_motivo_ausencia_id_foreign FOREIGN KEY (motivo_ausencia_id) REFERENCES public.motivos_ausencia(id) ON DELETE RESTRICT;


--
-- TOC entry 4470 (class 2606 OID 87027)
-- Name: ausencias ausencias_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id) ON DELETE RESTRICT;


--
-- TOC entry 4471 (class 2606 OID 87012)
-- Name: ausencias ausencias_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4472 (class 2606 OID 87007)
-- Name: ausencias ausencias_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ausencias
    ADD CONSTRAINT ausencias_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4402 (class 2606 OID 86203)
-- Name: cargos cargos_modalidad_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_modalidad_id_foreign FOREIGN KEY (modalidad_id) REFERENCES public.modalidad_contrato(id);


--
-- TOC entry 4403 (class 2606 OID 86198)
-- Name: cargos cargos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4419 (class 2606 OID 86367)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_cosecha_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_cosecha_id_foreign FOREIGN KEY (cosecha_id) REFERENCES public.registro_cosecha(id);


--
-- TOC entry 4420 (class 2606 OID 86372)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4421 (class 2606 OID 86362)
-- Name: cosecha_cuadrilla cosecha_cuadrilla_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cosecha_cuadrilla
    ADD CONSTRAINT cosecha_cuadrilla_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4461 (class 2606 OID 86943)
-- Name: empleado_contratos empleado_contratos_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos
    ADD CONSTRAINT empleado_contratos_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4462 (class 2606 OID 86938)
-- Name: empleado_contratos empleado_contratos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_contratos
    ADD CONSTRAINT empleado_contratos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4463 (class 2606 OID 86976)
-- Name: empleado_documentos empleado_documentos_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4464 (class 2606 OID 86981)
-- Name: empleado_documentos empleado_documentos_subido_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_subido_por_foreign FOREIGN KEY (subido_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4465 (class 2606 OID 86971)
-- Name: empleado_documentos empleado_documentos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_documentos
    ADD CONSTRAINT empleado_documentos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4404 (class 2606 OID 87055)
-- Name: empleados empleados_predio_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_predio_id_foreign FOREIGN KEY (predio_id) REFERENCES public.predios(id) ON DELETE SET NULL;


--
-- TOC entry 4405 (class 2606 OID 86222)
-- Name: empleados empleados_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4487 (class 2606 OID 87242)
-- Name: empresa_transportadora empresa_transportadora_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_transportadora
    ADD CONSTRAINT empresa_transportadora_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4510 (class 2606 OID 87526)
-- Name: entidades_bancarias entidades_bancarias_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entidades_bancarias
    ADD CONSTRAINT entidades_bancarias_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4507 (class 2606 OID 87478)
-- Name: eps eps_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eps
    ADD CONSTRAINT eps_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4490 (class 2606 OID 87289)
-- Name: extractoras extractoras_departamento_codigo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_departamento_codigo_foreign FOREIGN KEY (departamento_codigo) REFERENCES public.departamentos(codigo) ON DELETE SET NULL;


--
-- TOC entry 4491 (class 2606 OID 87294)
-- Name: extractoras extractoras_municipio_codigo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_municipio_codigo_foreign FOREIGN KEY (municipio_codigo) REFERENCES public.municipios(codigo) ON DELETE SET NULL;


--
-- TOC entry 4492 (class 2606 OID 87284)
-- Name: extractoras extractoras_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extractoras
    ADD CONSTRAINT extractoras_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4508 (class 2606 OID 87494)
-- Name: fondos_pension fondos_pension_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fondos_pension
    ADD CONSTRAINT fondos_pension_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4494 (class 2606 OID 87391)
-- Name: horas_extra horas_extra_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4495 (class 2606 OID 87401)
-- Name: horas_extra horas_extra_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4496 (class 2606 OID 87381)
-- Name: horas_extra horas_extra_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE RESTRICT;


--
-- TOC entry 4497 (class 2606 OID 87396)
-- Name: horas_extra horas_extra_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id) ON DELETE RESTRICT;


--
-- TOC entry 4498 (class 2606 OID 87376)
-- Name: horas_extra horas_extra_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4499 (class 2606 OID 87371)
-- Name: horas_extra horas_extra_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4500 (class 2606 OID 87386)
-- Name: horas_extra horas_extra_tipo_hora_extra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horas_extra
    ADD CONSTRAINT horas_extra_tipo_hora_extra_id_foreign FOREIGN KEY (tipo_hora_extra_id) REFERENCES public.tipos_hora_extra(id) ON DELETE RESTRICT;


--
-- TOC entry 4398 (class 2606 OID 86127)
-- Name: insumos insumos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4479 (class 2606 OID 87170)
-- Name: jornales jornales_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4480 (class 2606 OID 87190)
-- Name: jornales jornales_insumo_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_insumo_id_foreign FOREIGN KEY (insumo_id) REFERENCES public.insumos(id) ON DELETE SET NULL;


--
-- TOC entry 4481 (class 2606 OID 87175)
-- Name: jornales jornales_labor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_labor_id_foreign FOREIGN KEY (labor_id) REFERENCES public.labores(id) ON DELETE RESTRICT;


--
-- TOC entry 4482 (class 2606 OID 87180)
-- Name: jornales jornales_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE SET NULL;


--
-- TOC entry 4483 (class 2606 OID 87165)
-- Name: jornales jornales_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4484 (class 2606 OID 87185)
-- Name: jornales jornales_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id) ON DELETE SET NULL;


--
-- TOC entry 4485 (class 2606 OID 87160)
-- Name: jornales jornales_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jornales
    ADD CONSTRAINT jornales_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4400 (class 2606 OID 86164)
-- Name: labores labores_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labores
    ADD CONSTRAINT labores_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4389 (class 2606 OID 86050)
-- Name: lineas lineas_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id);


--
-- TOC entry 4390 (class 2606 OID 86045)
-- Name: lineas lineas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas
    ADD CONSTRAINT lineas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4449 (class 2606 OID 86699)
-- Name: liquidacion_detalle liquidacion_detalle_concepto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_concepto_id_foreign FOREIGN KEY (concepto_id) REFERENCES public.nomina_concepto(id) ON DELETE SET NULL;


--
-- TOC entry 4450 (class 2606 OID 86694)
-- Name: liquidacion_detalle liquidacion_detalle_liquidacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_liquidacion_id_foreign FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones(id);


--
-- TOC entry 4451 (class 2606 OID 86689)
-- Name: liquidacion_detalle liquidacion_detalle_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidacion_detalle
    ADD CONSTRAINT liquidacion_detalle_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4446 (class 2606 OID 86669)
-- Name: liquidaciones liquidaciones_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4447 (class 2606 OID 86664)
-- Name: liquidaciones liquidaciones_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4448 (class 2606 OID 86659)
-- Name: liquidaciones liquidaciones_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liquidaciones
    ADD CONSTRAINT liquidaciones_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4382 (class 2606 OID 85985)
-- Name: lotes lotes_predio_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_predio_id_foreign FOREIGN KEY (predio_id) REFERENCES public.predios(id);


--
-- TOC entry 4383 (class 2606 OID 85980)
-- Name: lotes lotes_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4519 (class 2606 OID 87708)
-- Name: market_carrito_items market_carrito_items_carrito_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carrito_items
    ADD CONSTRAINT market_carrito_items_carrito_id_foreign FOREIGN KEY (carrito_id) REFERENCES public.market_carritos(id) ON DELETE CASCADE;


--
-- TOC entry 4520 (class 2606 OID 87713)
-- Name: market_carrito_items market_carrito_items_producto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carrito_items
    ADD CONSTRAINT market_carrito_items_producto_id_foreign FOREIGN KEY (producto_id) REFERENCES public.market_productos(id) ON DELETE CASCADE;


--
-- TOC entry 4518 (class 2606 OID 87694)
-- Name: market_carritos market_carritos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_carritos
    ADD CONSTRAINT market_carritos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4525 (class 2606 OID 87780)
-- Name: market_pedido_estados_historial market_pedido_estados_historial_pedido_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_estados_historial
    ADD CONSTRAINT market_pedido_estados_historial_pedido_id_foreign FOREIGN KEY (pedido_id) REFERENCES public.market_pedidos(id) ON DELETE CASCADE;


--
-- TOC entry 4526 (class 2606 OID 87785)
-- Name: market_pedido_estados_historial market_pedido_estados_historial_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_estados_historial
    ADD CONSTRAINT market_pedido_estados_historial_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4523 (class 2606 OID 87758)
-- Name: market_pedido_items market_pedido_items_pedido_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_items
    ADD CONSTRAINT market_pedido_items_pedido_id_foreign FOREIGN KEY (pedido_id) REFERENCES public.market_pedidos(id) ON DELETE CASCADE;


--
-- TOC entry 4524 (class 2606 OID 87763)
-- Name: market_pedido_items market_pedido_items_producto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedido_items
    ADD CONSTRAINT market_pedido_items_producto_id_foreign FOREIGN KEY (producto_id) REFERENCES public.market_productos(id) ON DELETE RESTRICT;


--
-- TOC entry 4521 (class 2606 OID 87739)
-- Name: market_pedidos market_pedidos_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedidos
    ADD CONSTRAINT market_pedidos_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.market_proveedores(id) ON DELETE RESTRICT;


--
-- TOC entry 4522 (class 2606 OID 87734)
-- Name: market_pedidos market_pedidos_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pedidos
    ADD CONSTRAINT market_pedidos_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- TOC entry 4517 (class 2606 OID 87681)
-- Name: market_precios_volumen market_precios_volumen_producto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_precios_volumen
    ADD CONSTRAINT market_precios_volumen_producto_id_foreign FOREIGN KEY (producto_id) REFERENCES public.market_productos(id) ON DELETE CASCADE;


--
-- TOC entry 4516 (class 2606 OID 87668)
-- Name: market_producto_imagenes market_producto_imagenes_producto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_producto_imagenes
    ADD CONSTRAINT market_producto_imagenes_producto_id_foreign FOREIGN KEY (producto_id) REFERENCES public.market_productos(id) ON DELETE CASCADE;


--
-- TOC entry 4513 (class 2606 OID 87642)
-- Name: market_productos market_productos_categoria_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_productos
    ADD CONSTRAINT market_productos_categoria_id_foreign FOREIGN KEY (categoria_id) REFERENCES public.market_categorias(id) ON DELETE RESTRICT;


--
-- TOC entry 4514 (class 2606 OID 87637)
-- Name: market_productos market_productos_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_productos
    ADD CONSTRAINT market_productos_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.market_proveedores(id) ON DELETE CASCADE;


--
-- TOC entry 4515 (class 2606 OID 87647)
-- Name: market_productos market_productos_unidad_medida_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_productos
    ADD CONSTRAINT market_productos_unidad_medida_id_foreign FOREIGN KEY (unidad_medida_id) REFERENCES public.market_unidades_medida(id) ON DELETE RESTRICT;


--
-- TOC entry 4511 (class 2606 OID 87584)
-- Name: market_proveedor_user market_proveedor_user_proveedor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedor_user
    ADD CONSTRAINT market_proveedor_user_proveedor_id_foreign FOREIGN KEY (proveedor_id) REFERENCES public.market_proveedores(id) ON DELETE CASCADE;


--
-- TOC entry 4512 (class 2606 OID 87589)
-- Name: market_proveedor_user market_proveedor_user_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_proveedor_user
    ADD CONSTRAINT market_proveedor_user_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4401 (class 2606 OID 86183)
-- Name: modalidad_contrato modalidad_contrato_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modalidad_contrato
    ADD CONSTRAINT modalidad_contrato_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4452 (class 2606 OID 86732)
-- Name: model_has_permissions model_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 4453 (class 2606 OID 86744)
-- Name: model_has_roles model_has_roles_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4486 (class 2606 OID 87217)
-- Name: motivos_ausencia motivos_ausencia_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motivos_ausencia
    ADD CONSTRAINT motivos_ausencia_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4457 (class 2606 OID 86851)
-- Name: municipios municipios_departamento_codigo_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_departamento_codigo_foreign FOREIGN KEY (departamento_codigo) REFERENCES public.departamentos(codigo) ON DELETE RESTRICT;


--
-- TOC entry 4422 (class 2606 OID 86399)
-- Name: nomina_concepto nomina_concepto_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_concepto
    ADD CONSTRAINT nomina_concepto_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4437 (class 2606 OID 86566)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_cosecha_cuadrilla_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_cosecha_cuadrilla_id_foreign FOREIGN KEY (cosecha_cuadrilla_id) REFERENCES public.cosecha_cuadrilla(id);


--
-- TOC entry 4438 (class 2606 OID 86561)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4439 (class 2606 OID 86556)
-- Name: nomina_cosecha_ref nomina_cosecha_ref_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_cosecha_ref
    ADD CONSTRAINT nomina_cosecha_ref_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4431 (class 2606 OID 86516)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_concepto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_concepto_id_foreign FOREIGN KEY (concepto_id) REFERENCES public.nomina_concepto(id);


--
-- TOC entry 4432 (class 2606 OID 86511)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4433 (class 2606 OID 86506)
-- Name: nomina_empleado_concepto nomina_empleado_concepto_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado_concepto
    ADD CONSTRAINT nomina_empleado_concepto_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4427 (class 2606 OID 86485)
-- Name: nomina_empleado nomina_empleado_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4428 (class 2606 OID 87549)
-- Name: nomina_empleado nomina_empleado_liquidado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_liquidado_por_foreign FOREIGN KEY (liquidado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4429 (class 2606 OID 86480)
-- Name: nomina_empleado nomina_empleado_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id);


--
-- TOC entry 4430 (class 2606 OID 86475)
-- Name: nomina_empleado nomina_empleado_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_empleado
    ADD CONSTRAINT nomina_empleado_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4501 (class 2606 OID 87432)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_hora_extra_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_hora_extra_id_foreign FOREIGN KEY (hora_extra_id) REFERENCES public.horas_extra(id);


--
-- TOC entry 4502 (class 2606 OID 87427)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4503 (class 2606 OID 87422)
-- Name: nomina_hora_extra_ref nomina_hora_extra_ref_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_hora_extra_ref
    ADD CONSTRAINT nomina_hora_extra_ref_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4434 (class 2606 OID 87200)
-- Name: nomina_jornal_ref nomina_jornal_ref_jornal_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_jornal_id_foreign FOREIGN KEY (jornal_id) REFERENCES public.jornales(id) ON DELETE RESTRICT;


--
-- TOC entry 4435 (class 2606 OID 86535)
-- Name: nomina_jornal_ref nomina_jornal_ref_nomina_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_nomina_empleado_id_foreign FOREIGN KEY (nomina_empleado_id) REFERENCES public.nomina_empleado(id);


--
-- TOC entry 4436 (class 2606 OID 86530)
-- Name: nomina_jornal_ref nomina_jornal_ref_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_jornal_ref
    ADD CONSTRAINT nomina_jornal_ref_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4423 (class 2606 OID 86421)
-- Name: nomina_tabla_legal nomina_tabla_legal_concepto_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal
    ADD CONSTRAINT nomina_tabla_legal_concepto_id_foreign FOREIGN KEY (concepto_id) REFERENCES public.nomina_concepto(id);


--
-- TOC entry 4424 (class 2606 OID 86416)
-- Name: nomina_tabla_legal nomina_tabla_legal_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nomina_tabla_legal
    ADD CONSTRAINT nomina_tabla_legal_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4425 (class 2606 OID 86449)
-- Name: nominas nominas_cerrada_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_cerrada_por_foreign FOREIGN KEY (cerrada_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4426 (class 2606 OID 86444)
-- Name: nominas nominas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominas
    ADD CONSTRAINT nominas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4458 (class 2606 OID 86881)
-- Name: operaciones operaciones_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4459 (class 2606 OID 86876)
-- Name: operaciones operaciones_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4460 (class 2606 OID 86871)
-- Name: operaciones operaciones_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones
    ADD CONSTRAINT operaciones_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4391 (class 2606 OID 87048)
-- Name: palmas palmas_linea_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_linea_id_foreign FOREIGN KEY (linea_id) REFERENCES public.lineas(id) ON DELETE SET NULL;


--
-- TOC entry 4392 (class 2606 OID 86071)
-- Name: palmas palmas_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id);


--
-- TOC entry 4393 (class 2606 OID 86066)
-- Name: palmas palmas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.palmas
    ADD CONSTRAINT palmas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4399 (class 2606 OID 86141)
-- Name: precio_abono precio_abono_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_abono
    ADD CONSTRAINT precio_abono_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4396 (class 2606 OID 86111)
-- Name: precio_cosecha precio_cosecha_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4397 (class 2606 OID 86106)
-- Name: precio_cosecha precio_cosecha_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precio_cosecha
    ADD CONSTRAINT precio_cosecha_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4478 (class 2606 OID 87138)
-- Name: precios_palma precios_palma_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.precios_palma
    ADD CONSTRAINT precios_palma_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4380 (class 2606 OID 85952)
-- Name: predios predios_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predios
    ADD CONSTRAINT predios_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4394 (class 2606 OID 86091)
-- Name: promedio_lote promedio_lote_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4395 (class 2606 OID 86086)
-- Name: promedio_lote promedio_lote_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promedio_lote
    ADD CONSTRAINT promedio_lote_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4411 (class 2606 OID 86316)
-- Name: registro_cosecha registro_cosecha_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4412 (class 2606 OID 86918)
-- Name: registro_cosecha registro_cosecha_operacion_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_operacion_id_foreign FOREIGN KEY (operacion_id) REFERENCES public.operaciones(id) ON DELETE RESTRICT;


--
-- TOC entry 4413 (class 2606 OID 86321)
-- Name: registro_cosecha registro_cosecha_sublote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_sublote_id_foreign FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id);


--
-- TOC entry 4414 (class 2606 OID 86311)
-- Name: registro_cosecha registro_cosecha_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registro_cosecha
    ADD CONSTRAINT registro_cosecha_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4454 (class 2606 OID 86755)
-- Name: role_has_permissions role_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 4455 (class 2606 OID 86760)
-- Name: role_has_permissions role_has_permissions_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4384 (class 2606 OID 86004)
-- Name: semilla_lote semilla_lote_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE CASCADE;


--
-- TOC entry 4385 (class 2606 OID 86009)
-- Name: semilla_lote semilla_lote_semilla_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_semilla_id_foreign FOREIGN KEY (semilla_id) REFERENCES public.semillas(id) ON DELETE CASCADE;


--
-- TOC entry 4386 (class 2606 OID 85999)
-- Name: semilla_lote semilla_lote_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semilla_lote
    ADD CONSTRAINT semilla_lote_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4381 (class 2606 OID 85966)
-- Name: semillas semillas_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semillas
    ADD CONSTRAINT semillas_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4387 (class 2606 OID 86030)
-- Name: sublotes sublotes_lote_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes
    ADD CONSTRAINT sublotes_lote_id_foreign FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- TOC entry 4388 (class 2606 OID 86025)
-- Name: sublotes sublotes_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sublotes
    ADD CONSTRAINT sublotes_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4456 (class 2606 OID 86789)
-- Name: telescope_entries_tags telescope_entries_tags_entry_uuid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries_tags
    ADD CONSTRAINT telescope_entries_tags_entry_uuid_foreign FOREIGN KEY (entry_uuid) REFERENCES public.telescope_entries(uuid) ON DELETE CASCADE;


--
-- TOC entry 4375 (class 2606 OID 85862)
-- Name: tenant_config tenant_config_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_config
    ADD CONSTRAINT tenant_config_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4376 (class 2606 OID 85909)
-- Name: tenant_user tenant_user_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4377 (class 2606 OID 85914)
-- Name: tenant_user tenant_user_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_user
    ADD CONSTRAINT tenant_user_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4493 (class 2606 OID 87348)
-- Name: tipos_hora_extra tipos_hora_extra_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_hora_extra
    ADD CONSTRAINT tipos_hora_extra_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4488 (class 2606 OID 87265)
-- Name: transportadores transportadores_empresa_transportadora_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_empresa_transportadora_id_foreign FOREIGN KEY (empresa_transportadora_id) REFERENCES public.empresa_transportadora(id) ON DELETE RESTRICT;


--
-- TOC entry 4489 (class 2606 OID 87260)
-- Name: transportadores transportadores_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transportadores
    ADD CONSTRAINT transportadores_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4444 (class 2606 OID 86627)
-- Name: vacacion_acumulado vacacion_acumulado_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado
    ADD CONSTRAINT vacacion_acumulado_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4445 (class 2606 OID 86622)
-- Name: vacacion_acumulado vacacion_acumulado_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacacion_acumulado
    ADD CONSTRAINT vacacion_acumulado_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4440 (class 2606 OID 86599)
-- Name: vacaciones vacaciones_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_aprobado_por_foreign FOREIGN KEY (aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4441 (class 2606 OID 86594)
-- Name: vacaciones vacaciones_empleado_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_empleado_id_foreign FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- TOC entry 4442 (class 2606 OID 86604)
-- Name: vacaciones vacaciones_nomina_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_nomina_id_foreign FOREIGN KEY (nomina_id) REFERENCES public.nominas(id) ON DELETE SET NULL;


--
-- TOC entry 4443 (class 2606 OID 86589)
-- Name: vacaciones vacaciones_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vacaciones
    ADD CONSTRAINT vacaciones_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4415 (class 2606 OID 86348)
-- Name: viaje_detalle viaje_detalle_cosecha_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_cosecha_id_foreign FOREIGN KEY (cosecha_id) REFERENCES public.registro_cosecha(id);


--
-- TOC entry 4416 (class 2606 OID 87330)
-- Name: viaje_detalle viaje_detalle_reconteo_aprobado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_reconteo_aprobado_por_foreign FOREIGN KEY (reconteo_aprobado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4417 (class 2606 OID 86338)
-- Name: viaje_detalle viaje_detalle_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4418 (class 2606 OID 86343)
-- Name: viaje_detalle viaje_detalle_viaje_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_detalle
    ADD CONSTRAINT viaje_detalle_viaje_id_foreign FOREIGN KEY (viaje_id) REFERENCES public.viajes(id);


--
-- TOC entry 4504 (class 2606 OID 87462)
-- Name: viaje_documento_bascula viaje_documento_bascula_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4505 (class 2606 OID 87452)
-- Name: viaje_documento_bascula viaje_documento_bascula_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4506 (class 2606 OID 87457)
-- Name: viaje_documento_bascula viaje_documento_bascula_viaje_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viaje_documento_bascula
    ADD CONSTRAINT viaje_documento_bascula_viaje_id_foreign FOREIGN KEY (viaje_id) REFERENCES public.viajes(id) ON DELETE RESTRICT;


--
-- TOC entry 4406 (class 2606 OID 87317)
-- Name: viajes viajes_creado_por_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_creado_por_foreign FOREIGN KEY (creado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4407 (class 2606 OID 87302)
-- Name: viajes viajes_empresa_transportadora_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_empresa_transportadora_id_foreign FOREIGN KEY (empresa_transportadora_id) REFERENCES public.empresa_transportadora(id) ON DELETE RESTRICT;


--
-- TOC entry 4408 (class 2606 OID 87312)
-- Name: viajes viajes_extractora_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_extractora_id_foreign FOREIGN KEY (extractora_id) REFERENCES public.extractoras(id) ON DELETE RESTRICT;


--
-- TOC entry 4409 (class 2606 OID 86292)
-- Name: viajes viajes_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- TOC entry 4410 (class 2606 OID 87307)
-- Name: viajes viajes_transportador_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_transportador_id_foreign FOREIGN KEY (transportador_id) REFERENCES public.transportadores(id) ON DELETE RESTRICT;


--
-- TOC entry 4675 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO agente_user;


--
-- TOC entry 4676 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE agro_chat_messages; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agro_chat_messages TO agente_user;


--
-- TOC entry 4678 (class 0 OID 0)
-- Dependencies: 325
-- Name: SEQUENCE agro_chat_messages_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.agro_chat_messages_id_seq TO agente_user;


--
-- TOC entry 4679 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE agro_chat_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agro_chat_sessions TO agente_user;


--
-- TOC entry 4681 (class 0 OID 0)
-- Dependencies: 323
-- Name: SEQUENCE agro_chat_sessions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.agro_chat_sessions_id_seq TO agente_user;


--
-- TOC entry 4682 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE arl; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.arl TO agente_user;


--
-- TOC entry 4684 (class 0 OID 0)
-- Dependencies: 351
-- Name: SEQUENCE arl_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.arl_id_seq TO agente_user;


--
-- TOC entry 4685 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE auditorias; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.auditorias TO agente_user;


--
-- TOC entry 4687 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE auditorias_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.auditorias_id_seq TO agente_user;


--
-- TOC entry 4688 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE ausencias; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ausencias TO agente_user;


--
-- TOC entry 4690 (class 0 OID 0)
-- Dependencies: 321
-- Name: SEQUENCE ausencias_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.ausencias_id_seq TO agente_user;


--
-- TOC entry 4691 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE cache; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cache TO agente_user;


--
-- TOC entry 4692 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE cache_locks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cache_locks TO agente_user;


--
-- TOC entry 4693 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE cargos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cargos TO agente_user;


--
-- TOC entry 4695 (class 0 OID 0)
-- Dependencies: 262
-- Name: SEQUENCE cargos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.cargos_id_seq TO agente_user;


--
-- TOC entry 4696 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE cosecha_cuadrilla; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.cosecha_cuadrilla TO agente_user;


--
-- TOC entry 4698 (class 0 OID 0)
-- Dependencies: 272
-- Name: SEQUENCE cosecha_cuadrilla_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.cosecha_cuadrilla_id_seq TO agente_user;


--
-- TOC entry 4699 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE departamentos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.departamentos TO agente_user;


--
-- TOC entry 4700 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE empleado_contratos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empleado_contratos TO agente_user;


--
-- TOC entry 4702 (class 0 OID 0)
-- Dependencies: 317
-- Name: SEQUENCE empleado_contratos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empleado_contratos_id_seq TO agente_user;


--
-- TOC entry 4703 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE empleado_documentos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empleado_documentos TO agente_user;


--
-- TOC entry 4705 (class 0 OID 0)
-- Dependencies: 319
-- Name: SEQUENCE empleado_documentos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empleado_documentos_id_seq TO agente_user;


--
-- TOC entry 4706 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE empleados; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empleados TO agente_user;


--
-- TOC entry 4708 (class 0 OID 0)
-- Dependencies: 264
-- Name: SEQUENCE empleados_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empleados_id_seq TO agente_user;


--
-- TOC entry 4709 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE empresa_transportadora; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.empresa_transportadora TO agente_user;


--
-- TOC entry 4711 (class 0 OID 0)
-- Dependencies: 333
-- Name: SEQUENCE empresa_transportadora_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.empresa_transportadora_id_seq TO agente_user;


--
-- TOC entry 4712 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE entidades_bancarias; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.entidades_bancarias TO agente_user;


--
-- TOC entry 4714 (class 0 OID 0)
-- Dependencies: 353
-- Name: SEQUENCE entidades_bancarias_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.entidades_bancarias_id_seq TO agente_user;


--
-- TOC entry 4715 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE eps; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.eps TO agente_user;


--
-- TOC entry 4717 (class 0 OID 0)
-- Dependencies: 347
-- Name: SEQUENCE eps_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.eps_id_seq TO agente_user;


--
-- TOC entry 4718 (class 0 OID 0)
-- Dependencies: 338
-- Name: TABLE extractoras; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.extractoras TO agente_user;


--
-- TOC entry 4720 (class 0 OID 0)
-- Dependencies: 337
-- Name: SEQUENCE extractoras_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.extractoras_id_seq TO agente_user;


--
-- TOC entry 4721 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE failed_jobs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.failed_jobs TO agente_user;


--
-- TOC entry 4723 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE failed_jobs_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.failed_jobs_id_seq TO agente_user;


--
-- TOC entry 4724 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE fondos_pension; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.fondos_pension TO agente_user;


--
-- TOC entry 4726 (class 0 OID 0)
-- Dependencies: 349
-- Name: SEQUENCE fondos_pension_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.fondos_pension_id_seq TO agente_user;


--
-- TOC entry 4727 (class 0 OID 0)
-- Dependencies: 342
-- Name: TABLE horas_extra; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.horas_extra TO agente_user;


--
-- TOC entry 4729 (class 0 OID 0)
-- Dependencies: 341
-- Name: SEQUENCE horas_extra_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.horas_extra_id_seq TO agente_user;


--
-- TOC entry 4730 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE insumos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.insumos TO agente_user;


--
-- TOC entry 4732 (class 0 OID 0)
-- Dependencies: 254
-- Name: SEQUENCE insumos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.insumos_id_seq TO agente_user;


--
-- TOC entry 4733 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE job_batches; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_batches TO agente_user;


--
-- TOC entry 4734 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE jobs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.jobs TO agente_user;


--
-- TOC entry 4736 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE jobs_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.jobs_id_seq TO agente_user;


--
-- TOC entry 4737 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE jornales; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.jornales TO agente_user;


--
-- TOC entry 4739 (class 0 OID 0)
-- Dependencies: 329
-- Name: SEQUENCE jornales_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.jornales_id_seq TO agente_user;


--
-- TOC entry 4740 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE labores; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.labores TO agente_user;


--
-- TOC entry 4742 (class 0 OID 0)
-- Dependencies: 258
-- Name: SEQUENCE labores_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.labores_id_seq TO agente_user;


--
-- TOC entry 4743 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE lineas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lineas TO agente_user;


--
-- TOC entry 4745 (class 0 OID 0)
-- Dependencies: 246
-- Name: SEQUENCE lineas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lineas_id_seq TO agente_user;


--
-- TOC entry 4746 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE liquidacion_detalle; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.liquidacion_detalle TO agente_user;


--
-- TOC entry 4748 (class 0 OID 0)
-- Dependencies: 294
-- Name: SEQUENCE liquidacion_detalle_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.liquidacion_detalle_id_seq TO agente_user;


--
-- TOC entry 4749 (class 0 OID 0)
-- Dependencies: 293
-- Name: TABLE liquidaciones; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.liquidaciones TO agente_user;


--
-- TOC entry 4751 (class 0 OID 0)
-- Dependencies: 292
-- Name: SEQUENCE liquidaciones_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.liquidaciones_id_seq TO agente_user;


--
-- TOC entry 4752 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE lotes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.lotes TO agente_user;


--
-- TOC entry 4754 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE lotes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.lotes_id_seq TO agente_user;


--
-- TOC entry 4755 (class 0 OID 0)
-- Dependencies: 372
-- Name: TABLE market_carrito_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_carrito_items TO agente_user;


--
-- TOC entry 4757 (class 0 OID 0)
-- Dependencies: 371
-- Name: SEQUENCE market_carrito_items_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_carrito_items_id_seq TO agente_user;


--
-- TOC entry 4758 (class 0 OID 0)
-- Dependencies: 370
-- Name: TABLE market_carritos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_carritos TO agente_user;


--
-- TOC entry 4760 (class 0 OID 0)
-- Dependencies: 369
-- Name: SEQUENCE market_carritos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_carritos_id_seq TO agente_user;


--
-- TOC entry 4761 (class 0 OID 0)
-- Dependencies: 360
-- Name: TABLE market_categorias; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_categorias TO agente_user;


--
-- TOC entry 4763 (class 0 OID 0)
-- Dependencies: 359
-- Name: SEQUENCE market_categorias_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_categorias_id_seq TO agente_user;


--
-- TOC entry 4764 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE market_pedido_estados_historial; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_pedido_estados_historial TO agente_user;


--
-- TOC entry 4766 (class 0 OID 0)
-- Dependencies: 377
-- Name: SEQUENCE market_pedido_estados_historial_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_pedido_estados_historial_id_seq TO agente_user;


--
-- TOC entry 4767 (class 0 OID 0)
-- Dependencies: 376
-- Name: TABLE market_pedido_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_pedido_items TO agente_user;


--
-- TOC entry 4769 (class 0 OID 0)
-- Dependencies: 375
-- Name: SEQUENCE market_pedido_items_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_pedido_items_id_seq TO agente_user;


--
-- TOC entry 4770 (class 0 OID 0)
-- Dependencies: 374
-- Name: TABLE market_pedidos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_pedidos TO agente_user;


--
-- TOC entry 4772 (class 0 OID 0)
-- Dependencies: 373
-- Name: SEQUENCE market_pedidos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_pedidos_id_seq TO agente_user;


--
-- TOC entry 4773 (class 0 OID 0)
-- Dependencies: 368
-- Name: TABLE market_precios_volumen; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_precios_volumen TO agente_user;


--
-- TOC entry 4775 (class 0 OID 0)
-- Dependencies: 367
-- Name: SEQUENCE market_precios_volumen_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_precios_volumen_id_seq TO agente_user;


--
-- TOC entry 4776 (class 0 OID 0)
-- Dependencies: 366
-- Name: TABLE market_producto_imagenes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_producto_imagenes TO agente_user;


--
-- TOC entry 4778 (class 0 OID 0)
-- Dependencies: 365
-- Name: SEQUENCE market_producto_imagenes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_producto_imagenes_id_seq TO agente_user;


--
-- TOC entry 4779 (class 0 OID 0)
-- Dependencies: 364
-- Name: TABLE market_productos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_productos TO agente_user;


--
-- TOC entry 4781 (class 0 OID 0)
-- Dependencies: 363
-- Name: SEQUENCE market_productos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_productos_id_seq TO agente_user;


--
-- TOC entry 4782 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE market_proveedor_user; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_proveedor_user TO agente_user;


--
-- TOC entry 4784 (class 0 OID 0)
-- Dependencies: 357
-- Name: SEQUENCE market_proveedor_user_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_proveedor_user_id_seq TO agente_user;


--
-- TOC entry 4785 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE market_proveedores; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_proveedores TO agente_user;


--
-- TOC entry 4787 (class 0 OID 0)
-- Dependencies: 355
-- Name: SEQUENCE market_proveedores_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_proveedores_id_seq TO agente_user;


--
-- TOC entry 4788 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE market_unidades_medida; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.market_unidades_medida TO agente_user;


--
-- TOC entry 4790 (class 0 OID 0)
-- Dependencies: 361
-- Name: SEQUENCE market_unidades_medida_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.market_unidades_medida_id_seq TO agente_user;


--
-- TOC entry 4791 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE migrations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.migrations TO agente_user;


--
-- TOC entry 4793 (class 0 OID 0)
-- Dependencies: 215
-- Name: SEQUENCE migrations_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.migrations_id_seq TO agente_user;


--
-- TOC entry 4794 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE modalidad_contrato; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.modalidad_contrato TO agente_user;


--
-- TOC entry 4796 (class 0 OID 0)
-- Dependencies: 260
-- Name: SEQUENCE modalidad_contrato_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.modalidad_contrato_id_seq TO agente_user;


--
-- TOC entry 4797 (class 0 OID 0)
-- Dependencies: 300
-- Name: TABLE model_has_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.model_has_permissions TO agente_user;


--
-- TOC entry 4798 (class 0 OID 0)
-- Dependencies: 301
-- Name: TABLE model_has_roles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.model_has_roles TO agente_user;


--
-- TOC entry 4799 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE motivos_ausencia; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.motivos_ausencia TO agente_user;


--
-- TOC entry 4801 (class 0 OID 0)
-- Dependencies: 331
-- Name: SEQUENCE motivos_ausencia_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.motivos_ausencia_id_seq TO agente_user;


--
-- TOC entry 4802 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE municipios; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.municipios TO agente_user;


--
-- TOC entry 4803 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE nomina_concepto; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_concepto TO agente_user;


--
-- TOC entry 4805 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE nomina_concepto_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_concepto_id_seq TO agente_user;


--
-- TOC entry 4806 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE nomina_cosecha_ref; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_cosecha_ref TO agente_user;


--
-- TOC entry 4808 (class 0 OID 0)
-- Dependencies: 286
-- Name: SEQUENCE nomina_cosecha_ref_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_cosecha_ref_id_seq TO agente_user;


--
-- TOC entry 4809 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE nomina_empleado; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_empleado TO agente_user;


--
-- TOC entry 4810 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE nomina_empleado_concepto; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_empleado_concepto TO agente_user;


--
-- TOC entry 4812 (class 0 OID 0)
-- Dependencies: 282
-- Name: SEQUENCE nomina_empleado_concepto_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_empleado_concepto_id_seq TO agente_user;


--
-- TOC entry 4814 (class 0 OID 0)
-- Dependencies: 280
-- Name: SEQUENCE nomina_empleado_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_empleado_id_seq TO agente_user;


--
-- TOC entry 4815 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE nomina_hora_extra_ref; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_hora_extra_ref TO agente_user;


--
-- TOC entry 4817 (class 0 OID 0)
-- Dependencies: 343
-- Name: SEQUENCE nomina_hora_extra_ref_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_hora_extra_ref_id_seq TO agente_user;


--
-- TOC entry 4818 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE nomina_jornal_ref; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_jornal_ref TO agente_user;


--
-- TOC entry 4820 (class 0 OID 0)
-- Dependencies: 284
-- Name: SEQUENCE nomina_jornal_ref_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_jornal_ref_id_seq TO agente_user;


--
-- TOC entry 4821 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE nomina_tabla_legal; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nomina_tabla_legal TO agente_user;


--
-- TOC entry 4823 (class 0 OID 0)
-- Dependencies: 276
-- Name: SEQUENCE nomina_tabla_legal_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nomina_tabla_legal_id_seq TO agente_user;


--
-- TOC entry 4824 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE nominas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.nominas TO agente_user;


--
-- TOC entry 4826 (class 0 OID 0)
-- Dependencies: 278
-- Name: SEQUENCE nominas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.nominas_id_seq TO agente_user;


--
-- TOC entry 4827 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE operaciones; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.operaciones TO agente_user;


--
-- TOC entry 4829 (class 0 OID 0)
-- Dependencies: 315
-- Name: SEQUENCE operaciones_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.operaciones_id_seq TO agente_user;


--
-- TOC entry 4830 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE palmas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.palmas TO agente_user;


--
-- TOC entry 4832 (class 0 OID 0)
-- Dependencies: 248
-- Name: SEQUENCE palmas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.palmas_id_seq TO agente_user;


--
-- TOC entry 4833 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE password_reset_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.password_reset_tokens TO agente_user;


--
-- TOC entry 4834 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.permissions TO agente_user;


--
-- TOC entry 4836 (class 0 OID 0)
-- Dependencies: 296
-- Name: SEQUENCE permissions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.permissions_id_seq TO agente_user;


--
-- TOC entry 4837 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE precio_abono; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.precio_abono TO agente_user;


--
-- TOC entry 4839 (class 0 OID 0)
-- Dependencies: 256
-- Name: SEQUENCE precio_abono_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.precio_abono_id_seq TO agente_user;


--
-- TOC entry 4840 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE precio_cosecha; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.precio_cosecha TO agente_user;


--
-- TOC entry 4842 (class 0 OID 0)
-- Dependencies: 252
-- Name: SEQUENCE precio_cosecha_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.precio_cosecha_id_seq TO agente_user;


--
-- TOC entry 4843 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE precios_palma; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.precios_palma TO agente_user;


--
-- TOC entry 4845 (class 0 OID 0)
-- Dependencies: 327
-- Name: SEQUENCE precios_palma_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.precios_palma_id_seq TO agente_user;


--
-- TOC entry 4846 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE predios; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.predios TO agente_user;


--
-- TOC entry 4848 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE predios_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.predios_id_seq TO agente_user;


--
-- TOC entry 4849 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE promedio_lote; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.promedio_lote TO agente_user;


--
-- TOC entry 4851 (class 0 OID 0)
-- Dependencies: 250
-- Name: SEQUENCE promedio_lote_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.promedio_lote_id_seq TO agente_user;


--
-- TOC entry 4852 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE pulse_aggregates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pulse_aggregates TO agente_user;


--
-- TOC entry 4854 (class 0 OID 0)
-- Dependencies: 311
-- Name: SEQUENCE pulse_aggregates_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pulse_aggregates_id_seq TO agente_user;


--
-- TOC entry 4855 (class 0 OID 0)
-- Dependencies: 310
-- Name: TABLE pulse_entries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pulse_entries TO agente_user;


--
-- TOC entry 4857 (class 0 OID 0)
-- Dependencies: 309
-- Name: SEQUENCE pulse_entries_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pulse_entries_id_seq TO agente_user;


--
-- TOC entry 4858 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE pulse_values; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pulse_values TO agente_user;


--
-- TOC entry 4860 (class 0 OID 0)
-- Dependencies: 307
-- Name: SEQUENCE pulse_values_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pulse_values_id_seq TO agente_user;


--
-- TOC entry 4861 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE registro_cosecha; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.registro_cosecha TO agente_user;


--
-- TOC entry 4863 (class 0 OID 0)
-- Dependencies: 268
-- Name: SEQUENCE registro_cosecha_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.registro_cosecha_id_seq TO agente_user;


--
-- TOC entry 4864 (class 0 OID 0)
-- Dependencies: 302
-- Name: TABLE role_has_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.role_has_permissions TO agente_user;


--
-- TOC entry 4865 (class 0 OID 0)
-- Dependencies: 299
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.roles TO agente_user;


--
-- TOC entry 4867 (class 0 OID 0)
-- Dependencies: 298
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.roles_id_seq TO agente_user;


--
-- TOC entry 4868 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE semilla_lote; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.semilla_lote TO agente_user;


--
-- TOC entry 4870 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE semilla_lote_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.semilla_lote_id_seq TO agente_user;


--
-- TOC entry 4871 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE semillas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.semillas TO agente_user;


--
-- TOC entry 4873 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE semillas_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.semillas_id_seq TO agente_user;


--
-- TOC entry 4874 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.sessions TO agente_user;


--
-- TOC entry 4875 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE sublotes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.sublotes TO agente_user;


--
-- TOC entry 4877 (class 0 OID 0)
-- Dependencies: 244
-- Name: SEQUENCE sublotes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.sublotes_id_seq TO agente_user;


--
-- TOC entry 4878 (class 0 OID 0)
-- Dependencies: 304
-- Name: TABLE telescope_entries; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.telescope_entries TO agente_user;


--
-- TOC entry 4880 (class 0 OID 0)
-- Dependencies: 303
-- Name: SEQUENCE telescope_entries_sequence_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.telescope_entries_sequence_seq TO agente_user;


--
-- TOC entry 4881 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE telescope_entries_tags; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.telescope_entries_tags TO agente_user;


--
-- TOC entry 4882 (class 0 OID 0)
-- Dependencies: 306
-- Name: TABLE telescope_monitoring; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.telescope_monitoring TO agente_user;


--
-- TOC entry 4883 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE tenant_config; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenant_config TO agente_user;


--
-- TOC entry 4885 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE tenant_config_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tenant_config_id_seq TO agente_user;


--
-- TOC entry 4886 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE tenant_user; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenant_user TO agente_user;


--
-- TOC entry 4888 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE tenant_user_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tenant_user_id_seq TO agente_user;


--
-- TOC entry 4889 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenants TO agente_user;


--
-- TOC entry 4891 (class 0 OID 0)
-- Dependencies: 217
-- Name: SEQUENCE tenants_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tenants_id_seq TO agente_user;


--
-- TOC entry 4892 (class 0 OID 0)
-- Dependencies: 340
-- Name: TABLE tipos_hora_extra; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tipos_hora_extra TO agente_user;


--
-- TOC entry 4894 (class 0 OID 0)
-- Dependencies: 339
-- Name: SEQUENCE tipos_hora_extra_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.tipos_hora_extra_id_seq TO agente_user;


--
-- TOC entry 4895 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE transportadores; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transportadores TO agente_user;


--
-- TOC entry 4897 (class 0 OID 0)
-- Dependencies: 335
-- Name: SEQUENCE transportadores_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.transportadores_id_seq TO agente_user;


--
-- TOC entry 4898 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO agente_user;


--
-- TOC entry 4900 (class 0 OID 0)
-- Dependencies: 219
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.users_id_seq TO agente_user;


--
-- TOC entry 4901 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE vacacion_acumulado; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.vacacion_acumulado TO agente_user;


--
-- TOC entry 4903 (class 0 OID 0)
-- Dependencies: 290
-- Name: SEQUENCE vacacion_acumulado_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.vacacion_acumulado_id_seq TO agente_user;


--
-- TOC entry 4904 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE vacaciones; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.vacaciones TO agente_user;


--
-- TOC entry 4906 (class 0 OID 0)
-- Dependencies: 288
-- Name: SEQUENCE vacaciones_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.vacaciones_id_seq TO agente_user;


--
-- TOC entry 4907 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE viaje_detalle; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.viaje_detalle TO agente_user;


--
-- TOC entry 4909 (class 0 OID 0)
-- Dependencies: 270
-- Name: SEQUENCE viaje_detalle_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.viaje_detalle_id_seq TO agente_user;


--
-- TOC entry 4910 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE viaje_documento_bascula; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.viaje_documento_bascula TO agente_user;


--
-- TOC entry 4912 (class 0 OID 0)
-- Dependencies: 345
-- Name: SEQUENCE viaje_documento_bascula_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.viaje_documento_bascula_id_seq TO agente_user;


--
-- TOC entry 4913 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE viajes; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.viajes TO agente_user;


--
-- TOC entry 4915 (class 0 OID 0)
-- Dependencies: 266
-- Name: SEQUENCE viajes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.viajes_id_seq TO agente_user;


--
-- TOC entry 2465 (class 826 OID 65789)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE agro_user IN SCHEMA public GRANT ALL ON SEQUENCES TO agente_user;


--
-- TOC entry 2463 (class 826 OID 43785)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO agente_user;


--
-- TOC entry 2461 (class 826 OID 43816)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO agente_user;


--
-- TOC entry 2464 (class 826 OID 65788)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE agro_user IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO agente_user;


--
-- TOC entry 2462 (class 826 OID 43784)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO agente_user;


-- Completed on 2026-05-13 11:20:27

--
-- PostgreSQL database dump complete
--

\unrestrict x9fG6yyzwdiapIxkx9RzwyMl9KGwd5m4QppH1qzLloLgW8cKub99JVQAW7ylF6B

