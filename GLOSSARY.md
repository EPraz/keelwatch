# Keelwatch

Vocabulario del proyecto independiente de operaciones marítimas. Los perfiles y
reglas de esta demo son sintéticos.

## Language

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
