from __future__ import annotations

import math
import os
from typing import List, Dict, Optional, Any

class PsrcatDB:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), "..", "data", "psrcat_tar", "psrcat.db")
        self.db_path = db_path
        self.pulsars = self._parse_db()
        self.pulsar_map = {}
        for p in self.pulsars:
            name_j = p.get("PSRJ")
            name_b = p.get("PSRB")
            if name_j:
                self.pulsar_map[name_j] = p
            if name_b:
                self.pulsar_map[name_b] = p

    def _parse_db(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.db_path):
            return []
        
        try:
            with open(self.db_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception:
            return []
            
        records = content.split('@')
        parsed_pulsars = []
        
        for record in records:
            lines = record.strip().split('\n')
            p_data = {}
            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                parts = line.split()
                if len(parts) < 2:
                    continue
                param = parts[0]
                value = parts[1]
                # We take the first occurrence of a parameter
                if param not in p_data:
                    p_data[param] = value
            
            if not p_data or ("PSRJ" not in p_data and "PSRB" not in p_data):
                continue
                
            processed = self._process_pulsar(p_data)
            parsed_pulsars.append(processed)
            
        return parsed_pulsars

    def _hms_to_deg(self, hms: str) -> Optional[float]:
        try:
            parts = hms.replace(':', ' ').split()
            if len(parts) == 1:
                # Could be just hours?
                return float(parts[0]) * 15.0
            if len(parts) == 2:
                h, m = map(float, parts)
                return (h + m/60.0) * 15.0
            if len(parts) >= 3:
                h, m, s = map(float, parts[:3])
                return (h + m/60.0 + s/3600.0) * 15.0
            return None
        except Exception:
            return None

    def _dms_to_deg(self, dms: str) -> Optional[float]:
        try:
            sign = 1.0
            if dms.startswith('-'):
                sign = -1.0
                dms = dms[1:]
            elif dms.startswith('+'):
                dms = dms[1:]
            
            parts = dms.replace(':', ' ').split()
            if len(parts) == 1:
                return sign * float(parts[0])
            if len(parts) == 2:
                d, m = map(float, parts)
                return sign * (d + m/60.0)
            if len(parts) >= 3:
                d, m, s = map(float, parts[:3])
                return sign * (d + m/60.0 + s/3600.0)
            return None
        except Exception:
            return None

    def _process_pulsar(self, raw: Dict[str, str]) -> Dict[str, Any]:
        res = {}
        fields = [
            "PSRJ", "PSRB", "RAJ", "DECJ", "P0", "P1", "F0", "F1", "DM", 
            "S400", "S1400", "DIST", "DIST_DM", "TYPE", "ASSOC", "SURVEY", 
            "PB", "BINARY", "GL", "GB", "AGE", "BSURF", "EDOT", "W50"
        ]
        
        for f in fields:
            res[f] = raw.get(f)
            
        # Convert numeric fields
        num_fields = [
            "P0", "P1", "F0", "F1", "DM", "S400", "S1400", "DIST", 
            "DIST_DM", "PB", "GL", "GB", "AGE", "BSURF", "EDOT", "W50"
        ]
        for f in num_fields:
            if res[f] is not None:
                try:
                    res[f] = float(res[f])
                except Exception:
                    res[f] = None

        # Handle P0/P1 if missing but F0/F1 present
        if res["P0"] is None and res["F0"] is not None and res["F0"] != 0:
            res["P0"] = 1.0 / res["F0"]
        if res["P1"] is None and res["F1"] is not None and res["F0"] is not None and res["F0"] != 0:
            res["P1"] = -res["F1"] / (res["F0"]**2)

        # RAJ/DECJ to degrees
        res["RAJ_deg"] = self._hms_to_deg(res["RAJ"]) if res["RAJ"] else None
        res["DECJ_deg"] = self._dms_to_deg(res["DECJ"]) if res["DECJ"] else None

        # Derived fields
        p0 = res["P0"]
        p1 = res["P1"]
        if p0 is not None and p1 is not None and p1 > 0 and p0 > 0:
            res["derived_B_surf"] = 3.2e19 * math.sqrt(p0 * p1)
            res["derived_tau_c"] = p0 / (2.0 * p1)
            res["derived_Edot"] = 4.0 * (math.pi**2) * 1e45 * p1 / (p0**3)
        else:
            res["derived_B_surf"] = None
            res["derived_tau_c"] = None
            res["derived_Edot"] = None

        # Classification
        ptype = res.get("TYPE") or ""
        pb = res.get("PB")
        binary_model = res.get("BINARY")
        
        is_msp = (p0 is not None and p0 < 0.03)
        is_binary = (pb is not None or binary_model is not None)
        is_magnetar = ("AXP" in ptype or "SGR" in ptype)
        
        if is_magnetar:
            res["class"] = "Magnetar"
        elif is_msp:
            res["class"] = "MSP"
        elif is_binary:
            res["class"] = "Binary"
        else:
            res["class"] = "Normal"
            
        return res

    def get_all(self) -> List[Dict[str, Any]]:
        return self.pulsars

    def get_pulsar(self, name: str) -> Optional[Dict[str, Any]]:
        return self.pulsar_map.get(name)

    def get_stats(self) -> Dict[str, Any]:
        total = len(self.pulsars)
        classes = {}
        for p in self.pulsars:
            c = p["class"]
            classes[c] = classes.get(c, 0) + 1
        return {
            "total": total,
            "classes": classes
        }
