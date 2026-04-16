# dWallet v5 - Complete Security Architecture

## Visual Flow Diagram (Mermaid)

```mermaid
graph TB
    Users[👥 Users / External World]
    
    subgraph L7["🛡️ LAYER 7 - ROOT SECURITY LAYER (Entry Gate)"]
        direction TB
        L7A[Layer7Security<br/>• Circuit Breaker<br/>• Access Control<br/>• Emergency Pause]
        L7B[SecurityController<br/>• Threat Detection<br/>• User Behavior<br/>• Watchlist]
        L7C[EconomicDefenseLayer<br/>• Dynamic Fees<br/>• Slippage Protection<br/>• Volume Limits]
        L7D[SecurityGated<br/>• Base Contract]
        
        L7A <--> L7B
        L7B <--> L7C
        L7A --> L7D
    end
    
    subgraph EXEC["⚙️ EXECUTION LAYERS (0-6)"]
        direction TB
        L0[Layer 0: Execution<br/>• Core Logic<br/>• State Management]
        L1[Layer 1: Input Validation<br/>• Parameters<br/>• Signatures]
        L2[Layer 2: Rate Limiting<br/>• Per-User Limits<br/>• Time Windows]
        L3[Layer 3: Cross-Chain<br/>• Bridge Validation<br/>• Replay Prevention]
        L4[Layer 4: Custom<br/>• Protocol Checks]
        L5[Layer 5: Custom<br/>• Business Logic]
        L6[Layer 6: Pre-Settlement<br/>• Final Validation]
        
        L0 --> L1 --> L2 --> L3 --> L4 --> L5 --> L6
    end
    
    subgraph GOV["🏛️ GOVERNANCE & INTELLIGENCE (8-10)"]
        direction TB
        L8[Layer 8: Governance<br/>• Timelock<br/>• Multi-Sig<br/>• Voting]
        L9[Layer 9: Intelligence<br/>• Anomaly Detector<br/>• Monitoring<br/>• Alerts]
        L10[Layer 10: Meta-Layer<br/>• Invariant Checker<br/>• Assertions]
        
        L8 --> L9 --> L10
    end
    
    subgraph CORE["💎 CORE PROTOCOL LOGIC"]
        Vaults[Vaults]
        Perps[Perpetuals]
        Launchpad[Launchpad]
        Lending[Lending]
        DEX[DEX]
        Staking[Staking]
    end
    
    subgraph INFRA["🏗️ INFRASTRUCTURE"]
        InfraSec[InfrastructureSecurity<br/>• RPC Redundancy<br/>• Oracle Fallbacks<br/>• Health Monitoring]
    end
    
    Users --> L7A
    L7D --> L0
    L6 --> CORE
    CORE --> InfraSec
    
    L9 -.->|Monitors| L7A
    L8 -.->|Controls| L7A
    L10 -.->|Validates| L7A
    
    style L7 fill:#ff6b6b,stroke:#333,stroke-width:4px,color:#fff
    style L7A fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style L7B fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style L7C fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style L7D fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style EXEC fill:#4ecdc4,stroke:#333,stroke-width:2px,color:#fff
    style GOV fill:#45b7d1,stroke:#333,stroke-width:2px,color:#fff
    style CORE fill:#96ceb4,stroke:#333,stroke-width:2px,color:#fff
    style INFRA fill:#ffeaa7,stroke:#333,stroke-width:2px,color:#000
```

---

## Transaction Flow Through Layers

```mermaid
sequenceDiagram
    participant User
    participant L7 as Layer 7 Security
    participant SC as SecurityController
    participant ED as EconomicDefense
    participant SG as SecurityGated
    participant L0_6 as Layers 0-6
    participant Core as Core Protocol
    
    User->>L7: Initiate Transaction
    Note over L7: Validate Access
    
    L7->>SC: Detect Anomaly
    Note over SC: Calculate Threat Score (0-100)
    SC-->>L7: Return Threat Level
    
    alt Threat >= HIGH
        L7-->>User: ❌ REVERT (High Threat)
    else Threat < HIGH
        L7->>ED: Check Economic Limits
        Note over ED: Volume? Slippage? Fees?
        ED-->>L7: Limits OK
        
        alt Limits Exceeded
            L7-->>User: ❌ REVERT (Limits)
        else All Checks Pass
            L7->>SG: Authorize Execution
            SG->>L0_6: Execute Through Layers
            Note over L0_6: Layer 0-6 Validations
            L0_6->>Core: Final Execution
            Core-->>User: ✅ Success
        end
    end
    
    Note over L7,Core: Every Transaction Must Pass Layer 7 First!
```

---

## Component Interaction

```mermaid
graph LR
    subgraph "🔐 Layer 7 Components"
        A[Layer7Security]
        B[SecurityController]
        C[EconomicDefenseLayer]
        D[SecurityGated]
    end
    
    subgraph "📡 External Systems"
        E[AnomalyDetector<br/>Off-chain Bot]
        F[Layer 8 Governance]
        G[Oracle Feeds]
    end
    
    subgraph "⚙️ Execution"
        H[All Protocol Contracts]
    end
    
    A --> B
    B --> C
    A --> D
    E -.->|Alerts| A
    F -.->|Controls| A
    C --> G
    D --> H
    
    style A fill:#ff6b6b,stroke:#333,color:#fff
    style B fill:#ff6b6b,stroke:#333,color:#fff
    style C fill:#ff6b6b,stroke:#333,color:#fff
    style D fill:#ff6b6b,stroke:#333,color:#fff
```

---

## File Structure Map

```mermaid
graph TD
    Root[dwallet-v5/]
    
    Root --> Contracts[contracts/]
    Root --> Tests[test/]
    Root --> Monitor[monitoring/]
    
    Contracts --> L7[layer7/ ⭐]
    Contracts --> L1[layer1/]
    Contracts --> L2[layer2/]
    Contracts --> L3[layer3/]
    Contracts --> L8[layer8/]
    
    L7 --> L7A[Layer7Security.sol]
    L7 --> L7B[SecurityController.sol]
    L7 --> L7C[SecurityGated.sol]
    L7 --> L7D[EconomicDefenseLayer.sol]
    L7 --> L7E[README.md]
    L7 --> L7F[LAYER7_QUICKREF.md]
    
    Tests --> T7[layer7/]
    T7 --> T7A[Layer7Integration.test.cjs]
    
    Monitor --> M1[anomaly-detector.js]
    
    style L7 fill:#ff6b6b,stroke:#333,stroke-width:3px,color:#fff
    style L7A fill:#ff6b6b,stroke:#333,color:#fff
    style L7B fill:#ff6b6b,stroke:#333,color:#fff
    style L7C fill:#ff6b6b,stroke:#333,color:#fff
    style L7D fill:#ff6b6b,stroke:#333,color:#fff
```

---

## Security Layers Comparison

```mermaid
gantt
    title Layer Implementation Status
    dateFormat YYYY-MM-DD
    axisFormat %Y-%m
    
    section Layer 7 (Root)
    Layer7Security     :done, l7a, 2026-03-31, 1d
    SecurityController :done, l7b, 2026-03-31, 1d
    EconomicDefense    :done, l7c, 2026-03-31, 1d
    SecurityGated      :done, l7d, 2026-03-31, 1d
    
    section Execution (0-6)
    Layer 0-1          :done, l01, 2026-03-01, 30d
    Layer 2-3          :done, l23, 2026-03-01, 30d
    Layer 4-6          :active, l46, 2026-03-01, 30d
    
    section Governance (8-10)
    Layer 8 Governance :done, l8, 2026-03-15, 15d
    Layer 9 Intelligence :done, l9, 2026-03-15, 15d
    Layer 10 Meta      :done, l10, 2026-03-15, 15d
    
    section Infrastructure
    Infra Security     :done, infra, 2026-03-31, 1d
```

---

## Key Statistics

```mermaid
pie
    title Security Coverage by Layer
    "Layer 7 (Root)" : 25
    "Execution (0-6)" : 35
    "Governance (8-10)" : 20
    "Infrastructure" : 10
    "Testing & Docs" : 10
```

---

## Quick Reference Table

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| **Layer7Security** | `contracts/layer7/` | Entry gate, circuit breaker | ✅ Complete |
| **SecurityController** | `contracts/layer7/` | Threat detection engine | ✅ Complete |
| **SecurityGated** | `contracts/layer7/` | Base for gated contracts | ✅ Complete |
| **EconomicDefense** | `contracts/layer7/` | Economic protections | ✅ Complete |
| Layer 1-6 | `contracts/layer*/` | Execution layers | ✅ Implemented |
| Layer 8-10 | `contracts/layer*/` | Governance & Intelligence | ✅ Implemented |
| Infrastructure | `contracts/` | RPC & Oracle security | ✅ Complete |
| Formal Verification | `formal-verification/` | Invariants & fuzzing | ✅ Complete |

---

**🎉 Result**: Enterprise-grade security architecture with Layer 7 as the root entry gate controlling all system access!
