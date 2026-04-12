import { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { purchasePremium, restorePurchases } from '@/lib/iap';
import { PromoCodeSheet } from '@/components/profile/PromoCodeSheet';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FEATURES = [
  { icon: 'infinite-outline',        key: 'unlimited'    },
  { icon: 'shuffle-outline',          key: 'swaps'        },
  { icon: 'book-outline',             key: 'journal'      },
  { icon: 'notifications-outline',    key: 'reminders'    },
] as const;

export default function PaywallScreen() {
  const { t }    = useTranslation();
  const router   = useRouter();

  const [promoVisible,  setPromoVisible]  = useState(false);
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [purchasing,    setPurchasing]    = useState(false);
  const [restoring,     setRestoring]     = useState(false);

  const promoHeight = useRef(new Animated.Value(0)).current;

  const togglePromo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPromoExpanded((v) => !v);
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await purchasePremium();
      // purchasePremium resolves after verifyReceiptWithBackend — user is now premium
      router.back();
    } catch (err: any) {
      if (err?.message === 'IAP_NOT_CONFIGURED') {
        Alert.alert(
          t('paywall.iapUnavailableTitle'),
          t('paywall.iapUnavailableBody'),
        );
      } else if (err?.message !== 'USER_CANCELLED') {
        Alert.alert(t('auth.errors.generic'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      Alert.alert(t('paywall.restoreSuccess'));
      router.back();
    } catch (err: any) {
      if (err?.message === 'IAP_NOT_CONFIGURED') {
        Alert.alert(t('paywall.iapUnavailableTitle'), t('paywall.iapUnavailableBody'));
      } else {
        Alert.alert(t('paywall.restoreNotFound'));
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Close button */}
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Icon + heading */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="star" size={36} color={theme.colors.text} />
          </View>
          <Text style={s.heroTitle}>{t('paywall.title')}</Text>
          <Text style={s.heroSub}>{t('paywall.subtitle')}</Text>
        </View>

        {/* Feature list */}
        <View style={s.features}>
          {FEATURES.map((f) => (
            <View key={f.key} style={s.featureRow}>
              <View style={s.featureIcon}>
                <Ionicons name={f.icon} size={20} color={theme.colors.accent} />
              </View>
              <Text style={s.featureText}>{t(`paywall.features.${f.key}`)}</Text>
            </View>
          ))}
        </View>

        {/* Pricing card */}
        <View style={s.priceCard}>
          <View style={s.priceRow}>
            <Text style={s.price}>{t('paywall.price')}</Text>
            <Text style={s.pricePer}>{t('paywall.period')}</Text>
          </View>
          <Text style={s.trial}>{t('paywall.trial')}</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.ctaBtn} activeOpacity={0.8} onPress={handlePurchase} disabled={purchasing}>
          {purchasing
            ? <ActivityIndicator color={theme.colors.text} />
            : <Text style={s.ctaBtnText}>{t('paywall.cta')}</Text>
          }
        </TouchableOpacity>

        <Text style={s.cancelNote}>{t('paywall.cancelNote')}</Text>

        {/* Restore */}
        <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={restoring}>
          {restoring
            ? <ActivityIndicator color={theme.colors.textSecondary} size="small" />
            : <Text style={s.restoreText}>{t('paywall.restore')}</Text>
          }
        </TouchableOpacity>

        {/* Promo code reveal */}
        <TouchableOpacity style={s.promoLink} onPress={togglePromo} activeOpacity={0.7}>
          <Text style={s.promoLinkText}>{t('paywall.havePromo')}</Text>
          <Ionicons
            name={promoExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={theme.colors.accent}
          />
        </TouchableOpacity>

        {promoExpanded && (
          <TouchableOpacity style={s.promoOpenBtn} activeOpacity={0.8} onPress={() => setPromoVisible(true)}>
            <Ionicons name="pricetag-outline" size={18} color={theme.colors.text} />
            <Text style={s.promoOpenBtnText}>{t('paywall.enterPromo')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <PromoCodeSheet
        visible={promoVisible}
        onClose={() => setPromoVisible(false)}
        onSuccess={() => {
          setPromoVisible(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: theme.colors.bg },
  closeBtn:      { position: 'absolute', top: 56, right: theme.spacing.lg, zIndex: 10 },
  scroll:        { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg, alignItems: 'center' },

  // Hero
  hero:          { alignItems: 'center', gap: theme.spacing.sm },
  heroIcon:      { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  heroTitle:     { ...theme.font.displayLg, color: theme.colors.text, fontFamily: theme.font.family, textAlign: 'center' },
  heroSub:       { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family, textAlign: 'center', lineHeight: 24 },

  // Features
  features:      { width: '100%', gap: theme.spacing.sm },
  featureRow:    { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.md },
  featureIcon:   { width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: `${theme.colors.accent}22`, alignItems: 'center', justifyContent: 'center' },
  featureText:   { ...theme.font.body, color: theme.colors.text, fontFamily: theme.font.family, flex: 1 },

  // Pricing
  priceCard:     { width: '100%', backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.xs },
  priceRow:      { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs },
  price:         { fontSize: 34, fontWeight: '700', color: theme.colors.text, fontFamily: theme.font.family },
  pricePer:      { ...theme.font.body, color: theme.colors.textSecondary, fontFamily: theme.font.family },
  trial:         { ...theme.font.bodySmall, color: theme.colors.accent, fontFamily: theme.font.family, fontWeight: '600' },

  // CTA
  ctaBtn:        { width: '100%', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill, height: 56, alignItems: 'center', justifyContent: 'center' },
  ctaBtnText:    { ...theme.font.button, color: theme.colors.text, fontFamily: theme.font.family },
  cancelNote:    { ...theme.font.bodySmall, color: theme.colors.textMuted, fontFamily: theme.font.family, textAlign: 'center' },

  // Restore
  restoreBtn:    { paddingVertical: theme.spacing.sm },
  restoreText:   { ...theme.font.link, color: theme.colors.textSecondary, fontFamily: theme.font.family },

  // Promo
  promoLink:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  promoLinkText: { ...theme.font.link, color: theme.colors.accent, fontFamily: theme.font.family },
  promoOpenBtn:  { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.pill, height: 52 },
  promoOpenBtnText: { ...theme.font.body, fontWeight: '600', color: theme.colors.text, fontFamily: theme.font.family },
});
