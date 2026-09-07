import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

from engines.complexity_engine.complexity import calculate_complexity
from engines.optimizer.prompt_optimizer import optimize_prompt
from engines.recommendation.model_router import recommend_model
from engines.simulator.usage_simulator import build_projection
from engines.token_engine.token_counter import count_tokens, calculate_cost, compare_models
from engines.token_engine.model_registry import ModelRegistry

st.set_page_config(page_title="LLM Cost Twin", page_icon="📊", layout="wide")

MODEL_OPTIONS = ModelRegistry().list_models()

st.markdown("# LLM Cost Twin")
st.markdown("### A Zero-API AI FinOps Optimization Framework")
st.markdown("A local mathematical simulation of AI application cost behaviour.")

with st.sidebar:
    st.header("Controls")
    selected_model = st.selectbox("Model", MODEL_OPTIONS, index=0)
    st.slider("Optimization intensity", 0, 100, 50, key="opt_intensity")
    st.caption("No API keys required. Everything runs locally.")

page = st.radio(
    "Navigation",
    ["Cost Calculator", "Prompt Analyzer", "Prompt Optimizer", "Model Recommendation", "FinOps Simulator"],
    horizontal=True,
)

if page == "Cost Calculator":
    st.subheader("Cost Calculator")
    prompt = st.text_area("Enter prompt", value="Summarize the benefits of renewable energy for a business audience.", height=180)

    if st.button("Analyze Cost"):
        input_tokens = count_tokens(prompt, selected_model)
        output_tokens = max(20, input_tokens // 3)
        estimated_cost = calculate_cost(input_tokens, output_tokens, selected_model)
        comparison = compare_models(prompt)

        col1, col2, col3 = st.columns(3)
        col1.metric("Prompt tokens", f"{input_tokens}")
        col2.metric("Estimated cost", f"${estimated_cost:.6f}")
        col3.metric("Selected model", selected_model)

        st.markdown("#### Model Comparison")
        st.dataframe(comparison, use_container_width=True)

elif page == "Prompt Analyzer":
    st.subheader("Prompt Analyzer")
    prompt = st.text_area("Enter prompt", value="You must carefully analyze the trade-offs, compare the constraints, and provide a detailed rationale before making a final recommendation.", height=180)
    if st.button("Score Prompt"):
        result = calculate_complexity(prompt)
        st.metric("Prompt Complexity Score", f"{result['score']}/100")
        st.metric("Category", result['category'])
        st.info(result['explanation'])

elif page == "Prompt Optimizer":
    st.subheader("Prompt Optimizer")
    prompt = st.text_area("Enter prompt", value="Please carefully and thoroughly summarize the article in a concise and clear way while preserving the important points and key details.", height=180)
    if st.button("Optimize"):
        result = optimize_prompt(prompt)
        st.markdown("#### Original Prompt")
        st.write(result["original_prompt"])
        st.markdown("#### Optimized Prompt")
        st.write(result["optimized_prompt"])
        st.metric("Original tokens", result["original_tokens"])
        st.metric("New tokens", result["new_tokens"])
        st.metric("Percentage saved", f"{result['percentage_saved']}%")

elif page == "Model Recommendation":
    st.subheader("Model Recommendation")
    prompt = st.text_area("Enter prompt", value="Summarize the article and recommend the best action.", height=180)
    if st.button("Recommend"):
        recommendation = recommend_model(prompt)
        st.metric("Recommended model", recommendation["recommended_model"])
        st.metric("Complexity score", recommendation["complexity_score"])
        st.metric("Estimated savings", f"${recommendation['estimated_savings']:.6f}")
        st.info(recommendation["reason"])

else:
    st.subheader("FinOps Simulator")
    users = st.number_input("Users/day", min_value=10, value=1000, step=10)
    requests = st.number_input("Requests/user", min_value=1, value=3, step=1)
    tokens = st.number_input("Avg tokens/request", min_value=100, value=800, step=50)
    if st.button("Simulate"):
        projection = build_projection(int(users), int(requests), int(tokens), model=selected_model)
        col1, col2, col3 = st.columns(3)
        col1.metric("Daily cost", f"${projection['daily_cost']:.4f}")
        col2.metric("Monthly cost", f"${projection['monthly_cost']:.4f}")
        col3.metric("Yearly cost", f"${projection['yearly_cost']:.4f}")

        figs = []
        labels = ["Daily", "Monthly", "Yearly"]
        values = [projection["daily_cost"], projection["monthly_cost"], projection["yearly_cost"]]
        fig = px.bar(x=labels, y=values, title="Projected Cost Curve")
        st.plotly_chart(fig, use_container_width=True)

        optimized = [projection["optimized_daily_cost"], projection["optimized_monthly_cost"], projection["optimized_yearly_cost"]]
        fig2 = go.Figure()
        fig2.add_trace(go.Bar(x=labels, y=values, name="Baseline"))
        fig2.add_trace(go.Bar(x=labels, y=optimized, name="Optimized"))
        fig2.update_layout(barmode="group", title="Baseline vs Optimized")
        st.plotly_chart(fig2, use_container_width=True)
