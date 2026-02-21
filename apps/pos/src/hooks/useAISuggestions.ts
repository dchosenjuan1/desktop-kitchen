import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getCartSuggestions,
  getInventoryPushItems,
  submitSuggestionFeedback,
} from '../api';
import { AISuggestion, InventoryPushData } from '../types';

interface UseAISuggestionsOptions {
  cartItemIds: number[];
  employeeId?: number;
  enabled?: boolean;
}

interface UseAISuggestionsReturn {
  cartSuggestions: AISuggestion[];
  inventoryPush: InventoryPushData | null;
  pushItemIds: Set<number>;
  avoidItemIds: Set<number>;
  soldOutItemIds: Set<number>;
  lowStockItemIds: Set<number>;
  acceptSuggestion: (suggestion: AISuggestion) => void;
  dismissSuggestion: (suggestion: AISuggestion) => void;
  loading: boolean;
}

export function useAISuggestions({
  cartItemIds,
  employeeId,
  enabled = true,
}: UseAISuggestionsOptions): UseAISuggestionsReturn {
  const [cartSuggestions, setCartSuggestions] = useState<AISuggestion[]>([]);
  const [inventoryPush, setInventoryPush] = useState<InventoryPushData | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCartRef = useRef<string>('');

  // Derived sets for quick lookup
  const pushItemIds = new Set<number>(
    inventoryPush?.pushItems?.map((i) => i.menu_item_id) || []
  );
  const avoidItemIds = new Set<number>(
    inventoryPush?.avoidItems?.map((i) => i.menu_item_id) || []
  );
  const soldOutItemIds = new Set<number>(
    inventoryPush?.soldOutItemIds || []
  );
  const lowStockItemIds = new Set<number>(
    inventoryPush?.lowStockItemIds || []
  );

  // Poll inventory push every 60s
  useEffect(() => {
    if (!enabled) return;

    const fetchInventoryPush = async () => {
      try {
        const data = await getInventoryPushItems();
        setInventoryPush(data);
      } catch (error) {
        console.error('[AI] Failed to fetch inventory push:', error);
      }
    };

    fetchInventoryPush();
    const interval = setInterval(fetchInventoryPush, 60000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Debounced cart suggestions on cart change
  useEffect(() => {
    if (!enabled) return;

    const cartKey = cartItemIds.sort().join(',');
    if (cartKey === prevCartRef.current) return;
    prevCartRef.current = cartKey;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (cartItemIds.length === 0) {
      setCartSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const suggestions = await getCartSuggestions(cartItemIds);
        setCartSuggestions(suggestions);
      } catch (error) {
        console.error('[AI] Failed to fetch cart suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cartItemIds, enabled]);

  const acceptSuggestion = useCallback(
    (suggestion: AISuggestion) => {
      submitSuggestionFeedback({
        suggestion_type: suggestion.data.rule,
        suggestion_data: suggestion.data,
        action: 'accepted',
        employee_id: employeeId,
      }).catch((err) => console.error('[AI] Feedback error:', err));

      // Remove from displayed suggestions
      setCartSuggestions((prev) =>
        prev.filter((s) => s.data.suggested_item_id !== suggestion.data.suggested_item_id)
      );
    },
    [employeeId]
  );

  const dismissSuggestion = useCallback(
    (suggestion: AISuggestion) => {
      submitSuggestionFeedback({
        suggestion_type: suggestion.data.rule,
        suggestion_data: suggestion.data,
        action: 'dismissed',
        employee_id: employeeId,
      }).catch((err) => console.error('[AI] Feedback error:', err));

      setCartSuggestions((prev) =>
        prev.filter((s) => s.data.suggested_item_id !== suggestion.data.suggested_item_id)
      );
    },
    [employeeId]
  );

  return {
    cartSuggestions,
    inventoryPush,
    pushItemIds,
    avoidItemIds,
    soldOutItemIds,
    lowStockItemIds,
    acceptSuggestion,
    dismissSuggestion,
    loading,
  };
}
