import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BoostThankYouPage from "@/pages/BoostThankYouPage";
import CourseThankYouPage from "@/pages/CourseThankYouPage";
import EStoreThankYouPage from "@/pages/EStoreThankYouPage";
import TestSeriesThankYouPage from "@/pages/TestSeriesThankYouPage";

const renderPage = (page: React.ReactElement) => render(<MemoryRouter>{page}</MemoryRouter>);

describe("dedicated thank-you pages", () => {
  it.each([
    ["E-Store", <EStoreThankYouPage />, /E-Store confirmation/i, /View My Orders/i],
    ["course", <CourseThankYouPage />, /Course enrolment confirmation/i, /Go to My Courses/i],
    ["test series", <TestSeriesThankYouPage />, /Test-series registration confirmation/i, /Go to My Tests/i],
    ["BOOST", <BoostThankYouPage />, /BOOST registration confirmation/i, /Back to BOOST/i],
  ])("renders the dedicated %s confirmation page", (_name, page, heading, cta) => {
    renderPage(page as React.ReactElement);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: cta })).toBeInTheDocument();
  });
});
