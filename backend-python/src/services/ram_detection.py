"""
RAM detection and model recommendation service.

Detects system RAM and recommends appropriate GGUF models based on
available memory:
- 4GB RAM = 2B params model
- 8GB RAM = 7B params model  
- 16GB+ RAM = 13B+ params model
"""

import platform
import logging
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ModelRecommendation:
    """A recommended model based on RAM."""
    name: str
    parameters_billions: float  # Can be 0.5, 1.5, 3.0, 7.0, 14.0, etc.
    min_ram_gb: float
    description: str
    suggested: bool  # True if this is the recommended model for current RAM


# Model recommendations in order of increasing RAM requirements
MODEL_RECOMMENDATIONS = [
    ModelRecommendation(
        name="Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        parameters_billions=0.5,
        min_ram_gb=2.0,
        description="Ultra-lightweight model for systems with minimal RAM. Basic conversation only.",
        suggested=False,
    ),
    ModelRecommendation(
        name="Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        parameters_billions=1.5,
        min_ram_gb=4.0,
        description="Lightweight model for systems with 4GB+ RAM. Good for basic meditation guidance.",
        suggested=False,
    ),
    ModelRecommendation(
        name="Qwen/Qwen2.5-3B-Instruct-GGUF",
        parameters_billions=3.0,
        min_ram_gb=6.0,
        description="Medium-light model for systems with 6GB+ RAM. Better comprehension.",
        suggested=False,
    ),
    ModelRecommendation(
        name="Qwen/Qwen2.5-7B-Instruct-GGUF",
        parameters_billions=7.0,
        min_ram_gb=10.0,
        description="Mid-range model for systems with 10GB+ RAM. Good balance of quality and resource usage.",
        suggested=False,
    ),
    ModelRecommendation(
        name="Qwen/Qwen2.5-14B-Instruct-GGUF",
        parameters_billions=14.0,
        min_ram_gb=16.0,
        description="Large model for systems with 16GB+ RAM. Highest quality responses.",
        suggested=False,
    ),
]


def get_total_ram_gb() -> float:
    """
    Get total system RAM in GB.
    
    Returns:
        Total RAM in GB, or 0.0 if detection fails.
    """
    try:
        if platform.system() == "Darwin":  # macOS
            import subprocess
            result = subprocess.run(
                ["sysctl", "-n", "hw.memsize"],
                capture_output=True,
                text=True,
                check=True
            )
            bytes_mem = int(result.stdout.strip())
            return bytes_mem / (1024 ** 3)
        elif platform.system() == "Linux":
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        parts = line.split()
                        # Convert from KB to bytes
                        bytes_mem = int(parts[1]) * 1024
                        return bytes_mem / (1024 ** 3)
        elif platform.system() == "Windows":
            import ctypes
            kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
            c_ulong = ctypes.c_ulong
            
            class MEMORYSTATUS(ctypes.Structure):
                _fields_ = [
                    ("dwLength", c_ulong),
                    ("dwMemoryLoad", c_ulong),
                    ("dwTotalPhys", c_ulong),
                    ("dwAvailPhys", c_ulong),
                    ("dwTotalPageFile", c_ulong),
                    ("dwAvailPageFile", c_ulong),
                    ("dwTotalVirtual", c_ulong),
                    ("dwAvailVirtual", c_ulong),
                ]
            
            memstatus = MEMORYSTATUS()
            memstatus.dwLength = ctypes.sizeof(MEMORYSTATUS)
            kernel32.GlobalMemoryStatus(ctypes.byref(memstatus))  # type: ignore[attr-defined]
            return memstatus.dwTotalPhys / (1024 ** 3)
    except Exception as e:
        logger.warning(f"Failed to detect system RAM: {e}")
    
    return 0.0


def get_available_ram_gb() -> float:
    """
    Get available system RAM in GB.
    
    Returns:
        Available RAM in GB, or 0.0 if detection fails.
    """
    try:
        if platform.system() == "Darwin":  # macOS
            import subprocess
            # Get page size
            page_size_result = subprocess.run(
                ["sysctl", "-n", "vm.pagesize"],
                capture_output=True,
                text=True,
                check=True
            )
            page_size = int(page_size_result.stdout.strip())
            
            # Get free pages
            free_pages_result = subprocess.run(
                ["vm_stat"],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Parse free pages from vm_stat output
            for line in free_pages_result.stdout.split("\n"):
                if "Pages free" in line:
                    # Extract number from "Pages free:         1234."
                    parts = line.split(":")
                    if len(parts) > 1:
                        free_str = parts[1].strip().rstrip(".")
                        free_pages = int(free_str)
                        return (free_pages * page_size) / (1024 ** 3)
        elif platform.system() == "Linux":
            with open("/proc/meminfo", "r") as f:
                mem_info = {}
                for line in f:
                    if ":" in line:
                        key, value = line.split(":", 1)
                        mem_info[key.strip()] = value.strip()
                
                if "MemAvailable" in mem_info:
                    # MemAvailable is the better metric (accounts for reclamation)
                    parts = mem_info["MemAvailable"].split()
                    kb_mem = int(parts[0])
                    return kb_mem / (1024 ** 2)  # Convert KB to GB
                elif "MemFree" in mem_info:
                    parts = mem_info["MemFree"].split()
                    kb_mem = int(parts[0])
                    return kb_mem / (1024 ** 2)
        elif platform.system() == "Windows":
            import ctypes
            kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
            c_ulong = ctypes.c_ulong
            
            class MEMORYSTATUS(ctypes.Structure):
                _fields_ = [
                    ("dwLength", c_ulong),
                    ("dwMemoryLoad", c_ulong),
                    ("dwTotalPhys", c_ulong),
                    ("dwAvailPhys", c_ulong),
                    ("dwTotalPageFile", c_ulong),
                    ("dwAvailPageFile", c_ulong),
                    ("dwTotalVirtual", c_ulong),
                    ("dwAvailVirtual", c_ulong),
                ]
            
            memstatus = MEMORYSTATUS()
            memstatus.dwLength = ctypes.sizeof(MEMORYSTATUS)
            kernel32.GlobalMemoryStatus(ctypes.byref(memstatus))  # type: ignore[attr-defined]
            return memstatus.dwAvailPhys / (1024 ** 3)
    except Exception as e:
        logger.warning(f"Failed to detect available RAM: {e}")
    
    return 0.0


def get_recommended_models(ram_gb: Optional[float] = None) -> List[ModelRecommendation]:
    """
    Get model recommendations based on available RAM.
    
    Args:
        ram_gb: Total system RAM in GB. If None, will detect automatically.
    
    Returns:
        List of ModelRecommendation objects, with 'suggested' flag set for recommended model.
    """
    if ram_gb is None:
        ram_gb = get_total_ram_gb()
    
    recommendations = []
    suggested_index = -1
    
    # Find the LARGEST model that fits in available RAM (with 0.8x headroom for safety)
    for i, model in enumerate(MODEL_RECOMMENDATIONS):
        if ram_gb >= model.min_ram_gb * 0.8:
            suggested_index = i  # Keep updating to get the largest that fits
    
    for i, model in enumerate(MODEL_RECOMMENDATIONS):
        recommendations.append(ModelRecommendation(
            name=model.name,
            parameters_billions=model.parameters_billions,
            min_ram_gb=model.min_ram_gb,
            description=model.description,
            suggested=(i == suggested_index),
        ))
    
    return recommendations


def get_best_model_name(ram_gb: Optional[float] = None) -> str:
    """
    Get the recommended model name for the given RAM.
    
    Args:
        ram_gb: Total system RAM in GB. If None, will detect automatically.
    
    Returns:
        Name of the recommended model.
    """
    if ram_gb is None:
        ram_gb = get_total_ram_gb()
    
    recommendations = get_recommended_models(ram_gb)
    
    for rec in recommendations:
        if rec.suggested:
            return rec.name
    
    # If no model is suggested (RAM too low), return the lightest model
    return MODEL_RECOMMENDATIONS[0].name


class RAMDetectionService:
    """
    Service for detecting system RAM and providing model recommendations.
    """
    
    def __init__(self):
        """Initialize the RAM detection service."""
        self._total_ram_gb: Optional[float] = None
        self._available_ram_gb: Optional[float] = None
        self._recommendations: Optional[List[ModelRecommendation]] = None
    
    def detect(self) -> float:
        """
        Detect and cache system RAM.
        
        Returns:
            Total RAM in GB.
        """
        self._total_ram_gb = get_total_ram_gb()
        self._available_ram_gb = get_available_ram_gb()
        self._recommendations = get_recommended_models(self._total_ram_gb)
        
        logger.info(f"RAM detected: {self._total_ram_gb:.2f} GB total, "
                   f"{self._available_ram_gb:.2f} GB available")
        
        return self._total_ram_gb
    
    @property
    def total_ram_gb(self) -> float:
        """Get total RAM in GB (detects if not already detected)."""
        if self._total_ram_gb is None:
            self.detect()
        return self._total_ram_gb or 0.0
    
    @property
    def available_ram_gb(self) -> float:
        """Get available RAM in GB (detects if not already detected)."""
        if self._available_ram_gb is None:
            self.detect()
        return self._available_ram_gb or 0.0
    
    @property
    def recommendations(self) -> List[ModelRecommendation]:
        """Get model recommendations (detects if not already done)."""
        if self._recommendations is None:
            self.detect()
        return self._recommendations or []
    
    def get_suggested_model(self) -> Optional[str]:
        """Get the suggested model name for the detected RAM."""
        for rec in self.recommendations:
            if rec.suggested:
                return rec.name
        return None


# Global instance for convenience
_ram_detection_service: Optional[RAMDetectionService] = None


def get_ram_detection_service() -> RAMDetectionService:
    """Get the global RAM detection service instance."""
    global _ram_detection_service
    if _ram_detection_service is None:
        _ram_detection_service = RAMDetectionService()
    return _ram_detection_service
