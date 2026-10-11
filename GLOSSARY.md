# Keelwatch

Vocabulario del proyecto independiente de operaciones marítimas. Los perfiles y
reglas de esta demo son sintéticos.

## Language

**DemoAccount**:
Cuenta sintética compartida de acceso a Keelwatch, con el rol Operations Manager
o Auditor; identifica la cuenta usada en la demo, no a cada visitante individual.
_Avoid_: cuenta del propietario, cuenta personal del visitante, CrewMember.

**CrewMember**:
Perfil de un tripulante sintético perteneciente al registro de la flota, distinto
de una cuenta de acceso a Keelwatch.
_Avoid_: User, cuenta de usuario.

**CrewAssignment**:
Planificación que relaciona un tripulante con una embarcación, una función a bordo
y un periodo; no constituye evidencia de un embarque real.
_Avoid_: embarque confirmado, voyage, UserRoleAssignment.

**CrewAssignmentRole**:
Función sintética a bordo asociada a una planificación de tripulación, distinta
de los roles que conceden acceso a Keelwatch.
_Avoid_: rol de acceso, permiso, rango oficial.

**CrewAssignmentCancellation**:
Anulación definitiva de toda una planificación que libera su periodo reservado y
conserva el registro original como cancelado, con su motivo.
_Avoid_: desembarque, finalización anticipada, borrado.

**CrewRequirementEvaluation**:
Evaluación informativa de las cualificaciones demo de un tripulante para una
función a bordo durante un periodo planificado; no autoriza embarques ni acredita
aptitud real.
_Avoid_: aptitud aprobada, certificación reglamentaria.

**CrewComposition**:
Conjunto de tripulantes planificados para una embarcación en una fecha, según los
periodos de sus planes no cancelados; no acredita presencia real a bordo.
_Avoid_: dotación real, tripulación embarcada.

**MaintenanceOrder**:
Registro de un trabajo concreto de mantenimiento para una embarcación, con
categoría, prioridad, responsable y fecha objetivo.
_Avoid_: plan recurrente, inventario, orden de compra.

**MaintenanceAssignee**:
Usuario de Keelwatch responsable de una orden de mantenimiento, elegible por
estar activo y tener permiso para gestionar mantenimiento.
_Avoid_: CrewMember, tripulante asignado, rol de acceso.
