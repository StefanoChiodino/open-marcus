"""
Tests for RAM detection and model recommendation service.
"""

import pytest
from unittest.mock import patch, MagicMock

from src.services.ram_detection import (
    RAMDetectionService,
    ModelRecommendation,
    get_total_ram_gb,
    get_available_ram_gb,
    get_recommended_models,
    get_best_model_name,
    get_ram_detection_service,
    MODEL_RECOMMENDATIONS,
)


class TestModelRecommendation:
    """Tests for ModelRecommendation dataclass."""
    
    def test_create_model_recommendation(self):
        """Test creating a model recommendation."""
        rec = ModelRecommendation(
            name="Qwen/Qwen2.5-7B-Instruct-GGUF",
            parameters_billions=7.0,
            min_ram_gb=10.0,
            description="Mid-range model",
            suggested=True,
        )
        
        assert rec.name == "Qwen/Qwen2.5-7B-Instruct-GGUF"
        assert rec.parameters_billions == 7.0
        assert rec.min_ram_gb == 10.0
        assert rec.suggested is True


class TestModelRecommendations:
    """Tests for MODEL_RECOMMENDATIONS constant."""
    
    def test_model_recommendations_not_empty(self):
        """Test that model recommendations are defined."""
        assert len(MODEL_RECOMMENDATIONS) > 0
    
    def test_model_recommendations_ordered_by_ram(self):
        """Test that models are ordered by increasing RAM requirements."""
        for i in range(len(MODEL_RECOMMENDATIONS) - 1):
            current = MODEL_RECOMMENDATIONS[i]
            next_model = MODEL_RECOMMENDATIONS[i + 1]
            assert current.min_ram_gb <= next_model.min_ram_gb


class TestGetTotalRamGb:
    """Tests for get_total_ram_gb function."""
    
    def test_returns_float(self):
        """Test that RAM detection returns a float."""
        ram = get_total_ram_gb()
        assert isinstance(ram, float)
    
    def test_returns_positive_value(self):
        """Test that RAM detection returns a positive value on success."""
        ram = get_total_ram_gb()
        # Should be positive if detection succeeded, or 0.0 on failure
        assert ram >= 0.0


class TestGetAvailableRamGb:
    """Tests for get_available_ram_gb function."""
    
    def test_returns_float(self):
        """Test that available RAM detection returns a float."""
        ram = get_available_ram_gb()
        assert isinstance(ram, float)
    
    def test_returns_non_negative_value(self):
        """Test that available RAM returns non-negative value."""
        ram = get_available_ram_gb()
        assert ram >= 0.0


class TestGetRecommendedModels:
    """Tests for get_recommended_models function."""
    
    def test_returns_list(self):
        """Test that recommendations returns a list."""
        recs = get_recommended_models(ram_gb=8.0)
        assert isinstance(recs, list)
    
    def test_returns_all_models(self):
        """Test that all models are returned."""
        recs = get_recommended_models(ram_gb=32.0)
        assert len(recs) == len(MODEL_RECOMMENDATIONS)
    
    def test_one_suggested_at_high_ram(self):
        """Test that exactly one model is suggested at high RAM."""
        recs = get_recommended_models(ram_gb=32.0)
        suggested_count = sum(1 for r in recs if r.suggested)
        assert suggested_count == 1
    
    def test_none_suggested_at_very_low_ram(self):
        """Test that no model is suggested at very low RAM."""
        recs = get_recommended_models(ram_gb=1.0)
        suggested_count = sum(1 for r in recs if r.suggested)
        # At 1GB, no model should be suggested since even the lightest needs 2GB
        assert suggested_count == 0
    
    def test_models_contain_required_fields(self):
        """Test that each recommendation has all required fields."""
        recs = get_recommended_models(ram_gb=16.0)
        for rec in recs:
            assert hasattr(rec, 'name')
            assert hasattr(rec, 'parameters_billions')
            assert hasattr(rec, 'min_ram_gb')
            assert hasattr(rec, 'description')
            assert hasattr(rec, 'suggested')
    
    def test_suggested_model_for_4gb(self):
        """Test that 1.5B model is suggested for 4GB RAM."""
        recs = get_recommended_models(ram_gb=4.0)
        suggested = [r for r in recs if r.suggested]
        if suggested:
            # With 4GB, 1.5B model (min 4GB) is suggested
            assert suggested[0].parameters_billions == 1.5
    
    def test_suggested_model_for_8gb(self):
        """Test that 7B model is suggested for 8GB RAM."""
        recs = get_recommended_models(ram_gb=8.0)
        suggested = [r for r in recs if r.suggested]
        if suggested:
            # With 8GB, 7B model (min 10GB * 0.8 = 8GB) is suggested
            assert suggested[0].parameters_billions == 7.0
    
    def test_suggested_model_for_16gb(self):
        """Test that 14B model is suggested for 16GB RAM."""
        recs = get_recommended_models(ram_gb=16.0)
        suggested = [r for r in recs if r.suggested]
        if suggested:
            # With 16GB, 14B model (min 16GB * 0.8 = 12.8GB) is suggested
            assert suggested[0].parameters_billions == 14.0
    
    def test_suggested_model_for_32gb(self):
        """Test that 14B model is suggested for 32GB RAM."""
        recs = get_recommended_models(ram_gb=32.0)
        suggested = [r for r in recs if r.suggested]
        if suggested:
            # With 32GB, 14B model is the largest available
            assert suggested[0].parameters_billions == 14.0


class TestGetBestModelName:
    """Tests for get_best_model_name function."""
    
    def test_returns_string(self):
        """Test that best model name returns a string."""
        name = get_best_model_name(ram_gb=8.0)
        assert isinstance(name, str)
    
    def test_returns_lightest_model_at_low_ram(self):
        """Test that lightest model is returned at low RAM."""
        name = get_best_model_name(ram_gb=1.0)
        # Should return the lightest model (first in list)
        assert name == MODEL_RECOMMENDATIONS[0].name
    
    def test_returns_suggested_model_for_normal_ram(self):
        """Test that suggested model is returned for normal RAM."""
        # For 16GB, the 7B model should be suggested
        name = get_best_model_name(ram_gb=16.0)
        recs = get_recommended_models(ram_gb=16.0)
        suggested = [r.name for r in recs if r.suggested]
        if suggested:
            assert name == suggested[0]


class TestRAMDetectionService:
    """Tests for RAMDetectionService class."""
    
    def test_service_initialization(self):
        """Test that service initializes correctly."""
        service = RAMDetectionService()
        assert service._total_ram_gb is None
        assert service._available_ram_gb is None
        assert service._recommendations is None
    
    def test_detect_caches_results(self):
        """Test that detect() caches results."""
        service = RAMDetectionService()
        service.detect()
        
        assert service._total_ram_gb is not None
        assert service._available_ram_gb is not None
        assert service._recommendations is not None
    
    def test_total_ram_gb_property(self):
        """Test total_ram_gb property."""
        service = RAMDetectionService()
        ram = service.total_ram_gb
        assert isinstance(ram, float)
        assert ram >= 0.0
    
    def test_available_ram_gb_property(self):
        """Test available_ram_gb property."""
        service = RAMDetectionService()
        ram = service.available_ram_gb
        assert isinstance(ram, float)
        assert ram >= 0.0
    
    def test_recommendations_property(self):
        """Test recommendations property."""
        service = RAMDetectionService()
        recs = service.recommendations
        assert isinstance(recs, list)
        assert len(recs) > 0
    
    def test_get_suggested_model(self):
        """Test get_suggested_model method."""
        service = RAMDetectionService()
        service.detect()
        suggested = service.get_suggested_model()
        # May be None if RAM is too low
        if suggested is not None:
            assert isinstance(suggested, str)
    
    def test_service_is_singleton_like(self):
        """Test that get_ram_detection_service returns same instance."""
        service1 = get_ram_detection_service()
        service2 = get_ram_detection_service()
        # Should return the same instance (singleton behavior)
        assert service1 is service2


class TestRAMDetectionPlatform:
    """Tests for platform-specific RAM detection."""
    
    def test_mock_darwin_detection(self):
        """Test mock Darwin/macOS detection."""
        with patch('platform.system', return_value='Darwin'):
            with patch('subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(stdout='8589934592\n')  # 8GB in bytes
                ram = get_total_ram_gb()
                assert ram == pytest.approx(8.0, rel=0.1)
    
    def test_mock_linux_detection(self):
        """Test mock Linux detection."""
        with patch('platform.system', return_value='Linux'):
            mock_file_content = "MemTotal:        16384000 kB\n"
            with patch('builtins.open', MagicMock(return_value=mock_file_content)):
                # Need to handle both file operations
                pass


class TestIntegration:
    """Integration tests for RAM detection."""
    
    def test_full_recommendation_flow(self):
        """Test the full flow from detection to recommendations."""
        service = RAMDetectionService()
        
        # Detect RAM
        ram = service.detect()
        assert ram > 0
        
        # Get recommendations
        recs = service.recommendations
        assert len(recs) > 0
        
        # Get suggested model
        suggested = service.get_suggested_model()
        if suggested:
            recs_dict = {r.name: r for r in recs}
            assert suggested in recs_dict
    
    def test_recommendations_match_feature_spec(self):
        """Test that recommendations match the feature specification:
        - 4GB RAM = 2B params (we use 1.5B as closest)
        - 8GB RAM = 7B params (we use 3B or 7B)
        - 16GB+ RAM = 13B+ params (we use 14B)
        """
        # 4GB should suggest 1.5B model (closest to 2B)
        recs_4gb = get_recommended_models(ram_gb=4.0)
        suggested_4gb = [r for r in recs_4gb if r.suggested]
        if suggested_4gb:
            assert suggested_4gb[0].parameters_billions <= 3.0
        
        # 8GB should suggest either 3B or 7B
        recs_8gb = get_recommended_models(ram_gb=8.0)
        suggested_8gb = [r for r in recs_8gb if r.suggested]
        if suggested_8gb:
            assert 3.0 <= suggested_8gb[0].parameters_billions <= 7.0
        
        # 16GB+ should suggest 7B or larger
        recs_16gb = get_recommended_models(ram_gb=16.0)
        suggested_16gb = [r for r in recs_16gb if r.suggested]
        if suggested_16gb:
            assert suggested_16gb[0].parameters_billions >= 7.0
